import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, Float, DateTime
from sqlalchemy.orm import relationship
from .database import Base

# -----------------------------------------
# BACKWARD COMPATIBLE MODELS
# -----------------------------------------
class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    industry = Column(String, index=True)
    preferences = Column(Text, nullable=True)

    proposals = relationship("Proposal", back_populates="client")

class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)
    status = Column(String, default="draft") # draft, submitted, won, lost
    client_id = Column(Integer, ForeignKey("clients.id"))

    client = relationship("Client", back_populates="proposals")


# -----------------------------------------
# NEW ENTERPRISE CORE & MULTI-TENANT
# -----------------------------------------
class Company(Base):
    __tablename__ = "companies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True)
    domain = Column(String, unique=True, index=True)
    is_startup = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="company", cascade="all, delete-orphan")
    knowledge_nodes = relationship("KnowledgeNode", back_populates="company", cascade="all, delete-orphan")
    rfps = relationship("Rfp", back_populates="company", cascade="all, delete-orphan")
    proposal_projects = relationship("ProposalProject", back_populates="company", cascade="all, delete-orphan")
    competitors = relationship("Competitor", back_populates="company", cascade="all, delete-orphan")
    agent_tasks = relationship("AgentTask", back_populates="company", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"))
    email = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    role_level = Column(String, default="PROPOSAL_MANAGER") # SUPER_ADMIN, ENTERPRISE_ADMIN, PROPOSAL_MANAGER, SME, EXTERNAL_CONSULTANT
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="users")
    reviews = relationship("ProposalReview", back_populates="reviewer", cascade="all, delete-orphan")

# -----------------------------------------
# ORGANIZATIONAL MEMORY
# -----------------------------------------
class KnowledgeNode(Base):
    __tablename__ = "knowledge_nodes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"))
    category = Column(String) # COMPANY_PROFILE, CAPABILITY, CASE_STUDY, TEAM_EXPERTISE, COMPLIANCE, PRICING_FRAMEWORK
    title = Column(String, index=True)
    content = Column(Text)
    metadata_json = Column(Text, default="{}") # Store metadata as stringified JSON
    is_private = Column(Boolean, default=True)
    hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="knowledge_nodes")

# -----------------------------------------
# RFP ENGINE
# -----------------------------------------
class Rfp(Base):
    __tablename__ = "rfps"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"))
    title = Column(String, index=True)
    issuer = Column(String, index=True)
    due_date = Column(DateTime, nullable=True)
    raw_document_url = Column(String, nullable=True)
    status = Column(String, default="INGESTED") # INGESTED, ANALYZING, ANALYZED

    company = relationship("Company", back_populates="rfps")
    requirements = relationship("RfpRequirement", back_populates="rfp", cascade="all, delete-orphan")
    analyses = relationship("RfpAnalysis", back_populates="rfp", cascade="all, delete-orphan")
    proposal_projects = relationship("ProposalProject", back_populates="rfp", cascade="all, delete-orphan")
    compliance_matrices = relationship("ComplianceMatrix", back_populates="rfp", cascade="all, delete-orphan")

class RfpRequirement(Base):
    __tablename__ = "rfp_requirements"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    rfp_id = Column(String, ForeignKey("rfps.id", ondelete="CASCADE"))
    req_id = Column(String) # e.g. REQ-SEC-04
    extracted_text = Column(Text)
    source_reference = Column(String)
    risk_vector = Column(String) # HIGH, MEDIUM, LOW

    rfp = relationship("Rfp", back_populates="requirements")
    compliance_entries = relationship("ComplianceMatrix", back_populates="requirement", cascade="all, delete-orphan")

class RfpAnalysis(Base):
    __tablename__ = "rfp_analysis"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    rfp_id = Column(String, ForeignKey("rfps.id", ondelete="CASCADE"))
    win_probability_score = Column(Float, default=0.5)
    critical_gaps = Column(Text, default="[]") # JSON string array
    ai_insights = Column(Text, default="{}") # JSON string dict

    rfp = relationship("Rfp", back_populates="analyses")

# -----------------------------------------
# PROPOSAL WORKSPACE
# -----------------------------------------
class ProposalProject(Base):
    __tablename__ = "proposal_projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"))
    rfp_id = Column(String, ForeignKey("rfps.id", ondelete="CASCADE"), unique=True)
    title = Column(String, index=True)
    status = Column(String, default="DRAFT") # DRAFT, UNDER_REVIEW, APPROVED, SUBMITTED, WON, LOST
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="proposal_projects")
    rfp = relationship("Rfp", back_populates="proposal_projects")
    sections = relationship("ProposalSection", back_populates="proposal", cascade="all, delete-orphan")
    feedback = relationship("ProposalFeedback", back_populates="proposal", cascade="all, delete-orphan")

class ProposalSection(Base):
    __tablename__ = "proposal_sections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    proposal_id = Column(String, ForeignKey("proposal_projects.id", ondelete="CASCADE"))
    title = Column(String)
    order_index = Column(Integer)
    content = Column(Text)
    assigned_to = Column(String, nullable=True) # User ID (string)
    status = Column(String, default="DRAFT") # DRAFT, UNDER_REVIEW, APPROVED

    proposal = relationship("ProposalProject", back_populates="sections")
    reviews = relationship("ProposalReview", back_populates="section", cascade="all, delete-orphan")

class ProposalReview(Base):
    __tablename__ = "proposal_reviews"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    section_id = Column(String, ForeignKey("proposal_sections.id", ondelete="CASCADE"))
    reviewer_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    comments = Column(Text)
    status = Column(String) # APPROVED, REJECTED
    created_at = Column(DateTime, default=datetime.utcnow)

    section = relationship("ProposalSection", back_populates="reviews")
    reviewer = relationship("User", back_populates="reviews")

class ProposalFeedback(Base):
    __tablename__ = "proposal_feedback"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    proposal_id = Column(String, ForeignKey("proposal_projects.id", ondelete="CASCADE"))
    win_loss_outcome = Column(Boolean) # True = Win, False = Loss
    evaluator_score = Column(Float, nullable=True)
    evaluator_comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    proposal = relationship("ProposalProject", back_populates="feedback")

# -----------------------------------------
# COMPETITIVE & COMPLIANCE
# -----------------------------------------
class Competitor(Base):
    __tablename__ = "competitors"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"))
    name = Column(String, index=True)
    market_segment = Column(String, nullable=True)

    company = relationship("Company", back_populates="competitors")
    insights = relationship("CompetitorInsight", back_populates="competitor", cascade="all, delete-orphan")

class CompetitorInsight(Base):
    __tablename__ = "competitor_insights"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    competitor_id = Column(String, ForeignKey("competitors.id", ondelete="CASCADE"))
    capability_limits = Column(Text, default="[]") # JSON list of limitations
    pricing_strategy = Column(Text, nullable=True)
    extracted_date = Column(DateTime, default=datetime.utcnow)

    competitor = relationship("Competitor", back_populates="insights")

class ComplianceMatrix(Base):
    __tablename__ = "compliance_matrices"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    rfp_id = Column(String, ForeignKey("rfps.id", ondelete="CASCADE"))
    requirement_id = Column(String, ForeignKey("rfp_requirements.id", ondelete="CASCADE"))
    compliance_strategy = Column(Text)
    matching_asset_ref = Column(String, nullable=True)

    rfp = relationship("Rfp", back_populates="compliance_matrices")
    requirement = relationship("RfpRequirement", back_populates="compliance_entries")

# -----------------------------------------
# AI & SYSTEM TASKS
# -----------------------------------------
class AgentTask(Base):
    __tablename__ = "agent_tasks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"))
    agent_type = Column(String) # RFP_ANALYZER, PROPOSAL_WRITER, COMPLIANCE_QA, LEARNING_AGENT
    status = Column(String, default="PENDING") # PENDING, PROCESSING, COMPLETED, FAILED
    payload = Column(Text, default="{}") # JSON string
    result = Column(Text, nullable=True) # JSON string response
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="agent_tasks")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    token = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True)

    user = relationship("User")
