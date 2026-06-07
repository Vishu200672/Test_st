from pydantic import BaseModel, ConfigDict, field_validator
from typing import List, Optional
from datetime import datetime
import re

# -----------------------------------------
# BACKWARD COMPATIBLE SCHEMAS
# -----------------------------------------
class ProposalBase(BaseModel):
    title: str
    content: str
    status: str = "draft"

class ProposalCreate(ProposalBase):
    client_id: int

class Proposal(ProposalBase):
    id: int
    client_id: int

    model_config = ConfigDict(from_attributes=True)

class ClientBase(BaseModel):
    name: str
    industry: str
    preferences: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    id: int
    proposals: List[Proposal] = []

    model_config = ConfigDict(from_attributes=True)

class ProposalGenerateRequest(BaseModel):
    client_id: int
    topic: str


# -----------------------------------------
# NEW ENTERPRISE CORE & MULTI-TENANT
# -----------------------------------------
class CompanyBase(BaseModel):
    name: str
    domain: str
    is_startup: bool = False

class CompanyCreate(CompanyBase):
    pass

class Company(CompanyBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseModel):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role_level: str = "PROPOSAL_MANAGER"
    is_active: bool = True

    @field_validator('email')
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        email_regex = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
        if not re.match(email_regex, v):
            raise ValueError("Invalid email format")
        return v

class UserCreate(UserBase):
    company_id: str
    password: str

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]", v):
            raise ValueError("Password must contain at least one special character")
        return v

class User(UserBase):
    id: str
    company_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator('email')
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        email_regex = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
        if not re.match(email_regex, v):
            raise ValueError("Invalid email format")
        return v

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role_level: str
    company_id: str


# -----------------------------------------
# ORGANIZATIONAL MEMORY
# -----------------------------------------
class KnowledgeNodeBase(BaseModel):
    category: str
    title: str
    content: str
    metadata_json: Optional[str] = "{}"
    is_private: bool = True
    hash: Optional[str] = None

class KnowledgeNodeCreate(KnowledgeNodeBase):
    company_id: str

class KnowledgeNode(KnowledgeNodeBase):
    id: str
    company_id: str
    created_at: datetime
    last_updated: datetime

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------
# RFP ENGINE
# -----------------------------------------
class RfpRequirementBase(BaseModel):
    req_id: str
    extracted_text: str
    source_reference: str
    risk_vector: str

class RfpRequirementCreate(RfpRequirementBase):
    rfp_id: str

class RfpRequirement(RfpRequirementBase):
    id: str
    rfp_id: str

    model_config = ConfigDict(from_attributes=True)

class RfpAnalysisBase(BaseModel):
    win_probability_score: float
    critical_gaps: str
    ai_insights: str

class RfpAnalysisCreate(RfpAnalysisBase):
    rfp_id: str

class RfpAnalysis(RfpAnalysisBase):
    id: str
    rfp_id: str

    model_config = ConfigDict(from_attributes=True)

class ComplianceMatrixBase(BaseModel):
    compliance_strategy: str
    matching_asset_ref: Optional[str] = None

class ComplianceMatrixCreate(ComplianceMatrixBase):
    rfp_id: str
    requirement_id: str

class ComplianceMatrix(ComplianceMatrixBase):
    id: str
    rfp_id: str
    requirement_id: str
    requirement: Optional[RfpRequirement] = None

    model_config = ConfigDict(from_attributes=True)

class RfpBase(BaseModel):
    title: str
    issuer: str
    due_date: Optional[datetime] = None
    raw_document_url: Optional[str] = None
    status: str = "INGESTED"

class RfpCreate(RfpBase):
    company_id: str

class Rfp(RfpBase):
    id: str
    company_id: str
    requirements: List[RfpRequirement] = []
    analyses: List[RfpAnalysis] = []
    compliance_matrices: List[ComplianceMatrix] = []

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------
# PROPOSAL WORKSPACE
# -----------------------------------------
class ProposalReviewBase(BaseModel):
    comments: str
    status: str

class ProposalReviewCreate(ProposalReviewBase):
    section_id: str
    reviewer_id: str

class ProposalReview(ProposalReviewBase):
    id: str
    section_id: str
    reviewer_id: str
    reviewer: Optional[User] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProposalSectionBase(BaseModel):
    title: str
    order_index: int
    content: str
    assigned_to: Optional[str] = None
    status: str = "DRAFT"

class ProposalSectionCreate(ProposalSectionBase):
    proposal_id: str

class ProposalSection(ProposalSectionBase):
    id: str
    proposal_id: str
    reviews: List[ProposalReview] = []

    model_config = ConfigDict(from_attributes=True)

class ProposalFeedbackBase(BaseModel):
    win_loss_outcome: bool
    evaluator_score: Optional[float] = None
    evaluator_comments: Optional[str] = None

class ProposalFeedbackCreate(ProposalFeedbackBase):
    proposal_id: str

class ProposalFeedback(ProposalFeedbackBase):
    id: str
    proposal_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProposalProjectBase(BaseModel):
    title: str
    status: str = "DRAFT"

class ProposalProjectCreate(ProposalProjectBase):
    company_id: str
    rfp_id: str

class ProposalProject(ProposalProjectBase):
    id: str
    company_id: str
    rfp_id: str
    created_at: datetime
    sections: List[ProposalSection] = []
    feedback: List[ProposalFeedback] = []
    rfp: Optional[Rfp] = None

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------
# COMPETITIVE & COMPLIANCE
# -----------------------------------------
class CompetitorInsightBase(BaseModel):
    capability_limits: str
    pricing_strategy: Optional[str] = None

class CompetitorInsightCreate(CompetitorInsightBase):
    competitor_id: str

class CompetitorInsight(CompetitorInsightBase):
    id: str
    competitor_id: str
    extracted_date: datetime

    model_config = ConfigDict(from_attributes=True)

class CompetitorBase(BaseModel):
    name: str
    market_segment: Optional[str] = None

class CompetitorCreate(CompetitorBase):
    company_id: str

class Competitor(CompetitorBase):
    id: str
    company_id: str
    insights: List[CompetitorInsight] = []

    model_config = ConfigDict(from_attributes=True)


class CertificationBase(BaseModel):
    name: str
    valid_until: Optional[datetime] = None

class CertificationCreate(CertificationBase):
    company_id: str

class Certification(CertificationBase):
    id: str
    company_id: str

    model_config = ConfigDict(from_attributes=True)


class CaseStudyBase(BaseModel):
    title: str
    content: str

class CaseStudyCreate(CaseStudyBase):
    company_id: str

class CaseStudy(CaseStudyBase):
    id: str
    company_id: str

    model_config = ConfigDict(from_attributes=True)


class TeamMemberBase(BaseModel):
    name: str
    role: str

class TeamMemberCreate(TeamMemberBase):
    company_id: str

class TeamMember(TeamMemberBase):
    id: str
    company_id: str

    model_config = ConfigDict(from_attributes=True)


class CapabilityBase(BaseModel):
    description: str

class CapabilityCreate(CapabilityBase):
    company_id: str

class Capability(CapabilityBase):
    id: str
    company_id: str

    model_config = ConfigDict(from_attributes=True)



# -----------------------------------------
# AI & SYSTEM TASKS
# -----------------------------------------
class AgentTaskBase(BaseModel):
    agent_type: str
    status: str = "PENDING"
    payload: Optional[str] = "{}"
    result: Optional[str] = None

class AgentTaskCreate(AgentTaskBase):
    company_id: str

class AgentTask(AgentTaskBase):
    id: str
    company_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
