import uuid
import random
import hashlib
import secrets
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import json

from . import models, schemas, database

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}${key.hex()}"

def verify_password(password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    try:
        salt, key_hex = hashed_password.split('$')
        key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return key.hex() == key_hex
    except Exception:
        return False

# Create tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Enterprise Intelligent Proposal & Organizational Memory Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------
# SEEDING DATABASE FUNCTION
# -----------------------------------------
def seed_database(db: Session):
    # Check if database is already seeded
    if db.query(models.Company).first() is not None:
        return

    # 1. Create Companies
    corp = models.Company(
        id=str(uuid.uuid4()),
        name="EnterpriseCorp Logistics",
        domain="enterprisecorp.com",
        is_startup=False
    )
    startup = models.Company(
        id=str(uuid.uuid4()),
        name="CognitiveShip AI",
        domain="cognitiveship.ai",
        is_startup=True
    )
    db.add_all([corp, startup])
    db.commit()

    # Refresh companies to get IDs
    db.refresh(corp)
    db.refresh(startup)

    # 2. Create Users
    default_pwd_hash = hash_password("Password123!")
    manager = models.User(
        id=str(uuid.uuid4()),
        company_id=corp.id,
        email="manager@enterprisecorp.com",
        password_hash=default_pwd_hash,
        first_name="Sarah",
        last_name="Jenkins",
        role_level="PROPOSAL_MANAGER"
    )
    sme = models.User(
        id=str(uuid.uuid4()),
        company_id=corp.id,
        email="sme@enterprisecorp.com",
        password_hash=default_pwd_hash,
        first_name="David",
        last_name="Miller",
        role_level="SME"
    )
    admin = models.User(
        id=str(uuid.uuid4()),
        company_id=corp.id,
        email="admin@enterprisecorp.com",
        password_hash=default_pwd_hash,
        first_name="Alex",
        last_name="Chen",
        role_level="ENTERPRISE_ADMIN"
    )

    startup_manager = models.User(
        id=str(uuid.uuid4()),
        company_id=startup.id,
        email="founder@cognitiveship.ai",
        password_hash=default_pwd_hash,
        first_name="Elena",
        last_name="Rostova",
        role_level="PROPOSAL_MANAGER"
    )

    db.add_all([manager, sme, admin, startup_manager])
    db.commit()

    # Refresh users
    db.refresh(manager)
    db.refresh(sme)

    # 3. Create Knowledge Nodes (Organizational Memory)
    kn1 = models.KnowledgeNode(
        id=str(uuid.uuid4()),
        company_id=corp.id,
        category="COMPANY_PROFILE",
        title="Corporate Identity & Heritage",
        content="EnterpriseCorp Logistics is a global market leader in supply chain software, fleet tracking systems, and IoT telematics. Founded in 2012, we operate offices in New York, London, and Singapore. Our mission is to digitize and optimize global freight operations.",
        metadata_json='{"tags": ["corporate", "history", "profile"]}'
    )
    kn2 = models.KnowledgeNode(
        id=str(uuid.uuid4()),
        company_id=corp.id,
        category="COMPLIANCE",
        title="SOC 2 Type II Security Standard Compliance",
        content="EnterpriseCorp maintains an active SOC 2 Type II certification issued by Ernst & Young. Our security controls mandate AES-256 encryption at rest for all database nodes, TLS 1.3 encryption in transit, strict RBAC, and daily isolated automated database backups retained for 1 year.",
        metadata_json='{"tags": ["security", "soc2", "compliance"]}'
    )
    kn3 = models.KnowledgeNode(
        id=str(uuid.uuid4()),
        company_id=corp.id,
        category="CAPABILITY",
        title="Real-Time IoT Telematics API Platform",
        content="Our proprietary IoT Telematics API handles streaming coordinates from hardware tracker nodes. It is built using Node.js, WebSockets, and Redis, sustaining up to 150,000 concurrent updates per second with an average API latency of 12ms.",
        metadata_json='{"tags": ["api", "telematics", "iot", "performance"]}'
    )
    kn4 = models.KnowledgeNode(
        id=str(uuid.uuid4()),
        company_id=corp.id,
        category="CASE_STUDY",
        title="FedEx Supply Chain Integration Success",
        content="In 2024, EnterpriseCorp integrated our IoT tracking platform with FedEx's legacy logistics mainframe. The project was completed under budget in 4 months. Outcomes included: 18% reduction in misplaced shipments, 25% increase in dispatch efficiency, and $4.2M saved in annual operational leakage.",
        metadata_json='{"tags": ["case_study", "fedex", "integration"]}'
    )
    kn5 = models.KnowledgeNode(
        id=str(uuid.uuid4()),
        company_id=corp.id,
        category="TEAM_EXPERTISE",
        title="Engineering and Implementation Team Lineage",
        content="Our implementation team is led by Dr. Marcus Thorne, Chief Architect (PhD in Distributed Systems, MIT), with 15+ years experience. Supporting engineers hold certifications in AWS Solutions Architect Professional and CISSP security management.",
        metadata_json='{"tags": ["team", "expertise", "resumes"]}'
    )
    kn6 = models.KnowledgeNode(
        id=str(uuid.uuid4()),
        company_id=corp.id,
        category="PRICING_FRAMEWORK",
        title="Enterprise Subscription & Integration Model",
        content="Standard pricing consists of a base software subscription of $85,000/year (billed annually) plus $10/month per active tracking device. Custom legacy mainframe integration services are billed at a flat rate of $120,000.",
        metadata_json='{"tags": ["pricing", "licensing", "finance"]}'
    )

    # Startup Memory Nodes
    kn_st1 = models.KnowledgeNode(
        id=str(uuid.uuid4()),
        company_id=startup.id,
        category="CAPABILITY",
        title="Next-Gen AI Routing Engine",
        content="CognitiveShip AI uses a capability-based credibility framework to offer real-time multi-agent routing. Our deep learning model reduces shipping energy expenditure by 32% compared to standard Dijkstra paths.",
        metadata_json='{"tags": ["ai", "routing", "green"]}'
    )

    db.add_all([kn1, kn2, kn3, kn4, kn5, kn6, kn_st1])
    db.commit()

    # 4. Create Competitors & Insights
    c1 = models.Competitor(
        id=str(uuid.uuid4()),
        company_id=corp.id,
        name="LegacyLogistics Corp",
        market_segment="Enterprise Freight"
    )
    c2 = models.Competitor(
        id=str(uuid.uuid4()),
        company_id=corp.id,
        name="FlexiShip Systems",
        market_segment="Mid-Market Shipping Platforms"
    )
    db.add_all([c1, c2])
    db.commit()
    db.refresh(c1)
    db.refresh(c2)

    ci1 = models.CompetitorInsight(
        id=str(uuid.uuid4()),
        competitor_id=c1.id,
        capability_limits='["No real-time WebSocket streams", "Lacks mobile application", "Requires on-premise Oracle installations"]',
        pricing_strategy="Charges high initial setup fees (~$250,000) and locks customers into rigid 5-year contracts."
    )
    ci2 = models.CompetitorInsight(
        id=str(uuid.uuid4()),
        competitor_id=c2.id,
        capability_limits='["Max capacity of 10,000 assets", "No custom enterprise integrations"]',
        pricing_strategy="Low cost subscription (~$2,000/month) but charges heavy overage fees for high usage."
    )
    db.add_all([ci1, ci2])
    db.commit()

    # 5. Create a Seed RFP
    rfp = models.Rfp(
        id=str(uuid.uuid4()),
        company_id=corp.id,
        title="USPS Fleet Telematics & Integration RFP",
        issuer="United States Postal Service",
        due_date=datetime.utcnow() + timedelta(days=30),
        raw_document_url="https://s3.amazonaws.com/usps-bids/rfp-77291a.pdf",
        status="ANALYZED"
    )
    db.add(rfp)
    db.commit()
    db.refresh(rfp)

    # 6. Requirements
    req1 = models.RfpRequirement(
        id=str(uuid.uuid4()),
        rfp_id=rfp.id,
        req_id="REQ-TECH-01",
        extracted_text="The telematics system must support high-frequency streaming updates, pushing vehicle location logs at least once every 30 seconds.",
        source_reference="Section 4.1.2, Page 14",
        risk_vector="MEDIUM"
    )
    req2 = models.RfpRequirement(
        id=str(uuid.uuid4()),
        rfp_id=rfp.id,
        req_id="REQ-SEC-09",
        extracted_text="All database records and backups must be encrypted at rest using AES-256 standards, backed by a SOC 2 Type II audit report.",
        source_reference="Section 5.3.4, Page 22",
        risk_vector="LOW"
    )
    req3 = models.RfpRequirement(
        id=str(uuid.uuid4()),
        rfp_id=rfp.id,
        req_id="REQ-INT-05",
        extracted_text="The solution must integrate directly with the legacy postal dispatch mainframe systems for active billing validation.",
        source_reference="Section 7.2.1, Page 45",
        risk_vector="HIGH"
    )
    db.add_all([req1, req2, req3])
    db.commit()
    db.refresh(req1)
    db.refresh(req2)
    db.refresh(req3)

    # 7. RFP Analysis
    analysis = models.RfpAnalysis(
        id=str(uuid.uuid4()),
        rfp_id=rfp.id,
        win_probability_score=0.78,
        critical_gaps='["USPS billing mainframe integration requires a custom legacy COBOL connector which is not supported natively."]',
        ai_insights='{"key_strengths": "We have fully compliant SOC 2 certificates and a proven FedEx mainframe case study.", "pricing_recommendation": "Quote a separate integration service fee of $120,000 to cover the COBOL connector development."}'
    )
    db.add(analysis)
    db.commit()

    # 8. Compliance Matrix
    cm1 = models.ComplianceMatrix(
        id=str(uuid.uuid4()),
        rfp_id=rfp.id,
        requirement_id=req1.id,
        compliance_strategy="Our Real-Time IoT Telematics API supports updates down to 10 seconds, easily satisfying the 30-second requirement.",
        matching_asset_ref="Real-Time IoT Telematics API Platform"
    )
    cm2 = models.ComplianceMatrix(
        id=str(uuid.uuid4()),
        rfp_id=rfp.id,
        requirement_id=req2.id,
        compliance_strategy="We maintain a SOC 2 Type II certificate with Ernst & Young and encrypt databases at rest using AES-256.",
        matching_asset_ref="SOC 2 Type II Security Standard Compliance"
    )
    cm3 = models.ComplianceMatrix(
        id=str(uuid.uuid4()),
        rfp_id=rfp.id,
        requirement_id=req3.id,
        compliance_strategy="We will replicate the legacy mainframe bridge architecture built successfully during the FedEx Supply Chain Integration.",
        matching_asset_ref="FedEx Supply Chain Integration Success"
    )
    db.add_all([cm1, cm2, cm3])
    db.commit()

    # 9. Proposal Project & Sections
    prop = models.ProposalProject(
        id=str(uuid.uuid4()),
        company_id=corp.id,
        rfp_id=rfp.id,
        title="USPS National Fleet Telematics Solution",
        status="UNDER_REVIEW"
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)

    sec1 = models.ProposalSection(
        id=str(uuid.uuid4()),
        proposal_id=prop.id,
        title="Executive Summary & Project Overview",
        order_index=1,
        content="EnterpriseCorp is pleased to submit this proposal to modernize the USPS vehicle fleet. We bring our industry-leading IoT Telematics API Platform and a team of certified cloud architects. Drawing on our successful integration with FedEx's legacy mainframes, we present a highly reliable, secure, and compliant solution.",
        assigned_to=manager.id,
        status="APPROVED"
    )
    sec2 = models.ProposalSection(
        id=str(uuid.uuid4()),
        proposal_id=prop.id,
        title="Technical Telematics Architecture",
        order_index=2,
        content="The core of our solution is the EnterpriseCorp Real-Time IoT Telematics API. Using WebSockets, we push coordinates every 10 seconds. The solution runs on an auto-scaling AWS ECS container network managed by Redis queues, ensuring low-latency tracking of all fleet assets.",
        assigned_to=sme.id,
        status="UNDER_REVIEW"
    )
    sec3 = models.ProposalSection(
        id=str(uuid.uuid4()),
        proposal_id=prop.id,
        title="Security & Compliance Matrix",
        order_index=3,
        content="Security is built into every layer. We encrypt all databases at rest using AES-256. Our SOC 2 Type II certification proves our operational safety. We use strict IAM policies and Row-Level Security parameters to isolate data boundaries.",
        assigned_to=sme.id,
        status="DRAFT"
    )
    db.add_all([sec1, sec2, sec3])
    db.commit()

    # 10. Add some initial task logs
    task1 = models.AgentTask(
        id=str(uuid.uuid4()),
        company_id=corp.id,
        agent_type="RFP_ANALYZER",
        status="COMPLETED",
        payload='{"rfp_title": "USPS Fleet Telematics", "document": "rfp-77291a.pdf"}',
        result='{"requirements_extracted": 3, "risk_factors_identified": 1, "win_prob": 0.78}'
    )
    db.add(task1)
    db.commit()

# Run Seeding
db = database.SessionLocal()
try:
    seed_database(db)
finally:
    db.close()


# -----------------------------------------
# ROOT ROUTE
# -----------------------------------------
@app.get("/")
def read_root():
    return {"message": "Welcome to the Enterprise Intelligent Proposal & Organizational Memory Platform API"}


# -----------------------------------------
# BACKWARD COMPATIBLE APIS (CLIENTS & PROPOSALS)
# -----------------------------------------
@app.post("/clients/", response_model=schemas.Client)
def create_client(client: schemas.ClientCreate, db: Session = Depends(database.get_db)):
    db_client = models.Client(**client.model_dump())
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@app.get("/clients/", response_model=List[schemas.Client])
def read_clients(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    clients = db.query(models.Client).offset(skip).limit(limit).all()
    return clients

@app.get("/clients/{client_id}", response_model=schemas.Client)
def read_client(client_id: int, db: Session = Depends(database.get_db)):
    db_client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if db_client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return db_client

@app.post("/proposals/", response_model=schemas.Proposal)
def create_proposal(proposal: schemas.ProposalCreate, db: Session = Depends(database.get_db)):
    db_proposal = models.Proposal(**proposal.model_dump())
    db.add(db_proposal)
    db.commit()
    db.refresh(db_proposal)
    return db_proposal

@app.get("/proposals/", response_model=List[schemas.Proposal])
def read_proposals(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    proposals = db.query(models.Proposal).offset(skip).limit(limit).all()
    return proposals

@app.patch("/proposals/{proposal_id}", response_model=schemas.Proposal)
def update_proposal_status(proposal_id: int, status: str, db: Session = Depends(database.get_db)):
    db_proposal = db.query(models.Proposal).filter(models.Proposal.id == proposal_id).first()
    if db_proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    db_proposal.status = status
    db.commit()
    db.refresh(db_proposal)
    return db_proposal

@app.post("/generate-proposal/")
def generate_proposal(request: schemas.ProposalGenerateRequest, db: Session = Depends(database.get_db)):
    client = db.query(models.Client).filter(models.Client.id == request.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    past_proposals = db.query(models.Proposal).join(models.Client).filter(
        (models.Proposal.status == "won") &
        ((models.Proposal.client_id == client.id) | (models.Client.industry == client.industry))
    ).all()

    memory_context = []
    for p in past_proposals:
        memory_context.append(f"Past Successful Proposal ({p.title}): {p.content[:200]}...")

    client_prefs = f"Client Preferences: {client.preferences}" if client.preferences else "No specific preferences recorded."

    generated_content = f"Generated Proposal for {client.name} regarding {request.topic}\n\n"
    generated_content += f"Targeting Industry: {client.industry}\n"
    generated_content += f"{client_prefs}\n\n"

    if memory_context:
        generated_content += "Based on our successful past engagements, we recommend:\n"
        for ctx in memory_context:
            generated_content += f"- {ctx}\n"
    else:
        generated_content += "This is a new area for us. We will apply our best practices for the industry.\n"

    generated_content += f"\nDetailed solution for {request.topic}..."

    return {
        "title": f"Proposal for {request.topic}",
        "content": generated_content,
        "memory_used": len(past_proposals) > 0
    }


# -----------------------------------------
# NEW ENTERPRISE WORKSPACE & CORE ENDPOINTS
# -----------------------------------------

# --- Companies ---
@app.get("/companies/", response_model=List[schemas.Company])
def get_companies(db: Session = Depends(database.get_db)):
    return db.query(models.Company).all()

@app.post("/companies/", response_model=schemas.Company)
def create_company(company: schemas.CompanyCreate, db: Session = Depends(database.get_db)):
    existing = db.query(models.Company).filter(models.Company.domain == company.domain).first()
    if existing:
        raise HTTPException(status_code=400, detail="Domain already registered")
    db_company = models.Company(**company.model_dump())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

@app.get("/companies/{company_id}/users/", response_model=List[schemas.User])
def get_company_users(company_id: str, db: Session = Depends(database.get_db)):
    return db.query(models.User).filter(models.User.company_id == company_id).all()

@app.post("/users/", response_model=schemas.User)
def create_company_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    # Check if email is unique
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Verification Failed: User email already registered")
    
    user_data = user.model_dump()
    password = user_data.pop("password")
    password_hash = hash_password(password)
    
    db_user = models.User(**user_data, password_hash=password_hash)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# --- Authentication & Verification Endpoints ---

@app.post("/auth/login", response_model=schemas.Token)
def login(login_in: schemas.UserLogin, db: Session = Depends(database.get_db)):
    # 1. Verification: User existence
    user = db.query(models.User).filter(models.User.email == login_in.email).first()
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Verification Failed: No account found with this email address."
        )

    # 2. Verification: Active status
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Verification Failed: Your account has been deactivated. Please contact support."
        )

    # 3. Verification: Password matching
    if not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Verification Failed: Incorrect password. Please try again."
        )

    # 4. Verification: Tenant company association
    company = db.query(models.Company).filter(models.Company.id == user.company_id).first()
    if not company:
        raise HTTPException(
            status_code=404,
            detail="Verification Failed: Mapped tenant company not found."
        )

    # Create session token
    session_token = secrets.token_hex(32)
    # Expires in 1 day
    expires_at = datetime.utcnow() + timedelta(days=1)
    
    # Save session to database (storing session data securely)
    session = models.UserSession(
        user_id=user.id,
        token=session_token,
        expires_at=expires_at
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return schemas.Token(
        access_token=session_token,
        user_id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role_level=user.role_level,
        company_id=user.company_id
    )

@app.post("/auth/logout")
def logout(token: str, db: Session = Depends(database.get_db)):
    # Find active session in database and mark it inactive
    session = db.query(models.UserSession).filter(
        models.UserSession.token == token,
        models.UserSession.is_active == True
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Active session not found")
        
    session.is_active = False
    db.commit()
    return {"message": "Logged out successfully. Session invalidated in database."}


# --- Knowledge Engine (Memory) ---
@app.get("/companies/{company_id}/knowledge/", response_model=List[schemas.KnowledgeNode])
def get_knowledge_nodes(company_id: str, category: Optional[str] = None, db: Session = Depends(database.get_db)):
    query = db.query(models.KnowledgeNode).filter(models.KnowledgeNode.company_id == company_id)
    if category:
        query = query.filter(models.KnowledgeNode.category == category)
    return query.all()

@app.post("/knowledge/", response_model=schemas.KnowledgeNode)
def create_knowledge_node(node: schemas.KnowledgeNodeCreate, db: Session = Depends(database.get_db)):
    # Calculate simple hash
    text_hash = str(hash(node.content))
    db_node = models.KnowledgeNode(**node.model_dump(), hash=text_hash)
    db.add(db_node)
    db.commit()
    db.refresh(db_node)
    return db_node

@app.delete("/knowledge/{node_id}")
def delete_knowledge_node(node_id: str, db: Session = Depends(database.get_db)):
    db_node = db.query(models.KnowledgeNode).filter(models.KnowledgeNode.id == node_id).first()
    if not db_node:
        raise HTTPException(status_code=404, detail="Knowledge node not found")
    db.delete(db_node)
    db.commit()
    return {"message": "Knowledge node deleted"}

@app.put("/knowledge/{node_id}", response_model=schemas.KnowledgeNode)
def update_knowledge_node(node_id: str, node_update: schemas.KnowledgeNodeBase, db: Session = Depends(database.get_db)):
    db_node = db.query(models.KnowledgeNode).filter(models.KnowledgeNode.id == node_id).first()
    if not db_node:
        raise HTTPException(status_code=404, detail="Knowledge node not found")
    for key, val in node_update.model_dump().items():
        setattr(db_node, key, val)
    db_node.hash = str(hash(db_node.content))
    db.commit()
    db.refresh(db_node)
    return db_node


# --- RFP Intelligence ---
@app.get("/companies/{company_id}/rfps/", response_model=List[schemas.Rfp])
def get_rfps(company_id: str, db: Session = Depends(database.get_db)):
    return db.query(models.Rfp).filter(models.Rfp.company_id == company_id).all()

@app.post("/rfps/", response_model=schemas.Rfp)
def create_rfp(rfp_in: schemas.RfpCreate, db: Session = Depends(database.get_db)):
    db_rfp = models.Rfp(
        id=str(uuid.uuid4()),
        company_id=rfp_in.company_id,
        title=rfp_in.title,
        issuer=rfp_in.issuer,
        due_date=rfp_in.due_date,
        raw_document_url=rfp_in.raw_document_url,
        status="ANALYZED" # Immediately analyze it for demo/interactive purposes
    )
    db.add(db_rfp)
    db.commit()
    db.refresh(db_rfp)

    # 1. Generate Mock Requirements
    reqs = [
        models.RfpRequirement(
            id=str(uuid.uuid4()),
            rfp_id=db_rfp.id,
            req_id="REQ-TECH-01",
            extracted_text=f"The contractor must deliver a high-quality {rfp_in.title} containing responsive user interfaces.",
            source_reference="Section 2.1, Page 3",
            risk_vector="LOW"
        ),
        models.RfpRequirement(
            id=str(uuid.uuid4()),
            rfp_id=db_rfp.id,
            req_id="REQ-SEC-02",
            extracted_text="All communications must support industry-grade encryption parameters and restrict external data leakage.",
            source_reference="Section 4.3, Page 8",
            risk_vector="MEDIUM"
        ),
        models.RfpRequirement(
            id=str(uuid.uuid4()),
            rfp_id=db_rfp.id,
            req_id="REQ-INT-03",
            extracted_text="The solution must implement customized legacy data synchronizations with corporate databases.",
            source_reference="Section 9.1, Page 12",
            risk_vector="HIGH"
        )
    ]
    db.add_all(reqs)
    db.commit()

    for r in reqs:
        db.refresh(r)

    # 2. Add RFP Analysis
    analysis = models.RfpAnalysis(
        id=str(uuid.uuid4()),
        rfp_id=db_rfp.id,
        win_probability_score=round(random.uniform(0.55, 0.92), 2),
        critical_gaps=json.dumps(["Legacy integration requirement requires specialized development or knowledge ref lookup."]),
        ai_insights=json.dumps({
            "key_strengths": "We possess custom capabilities in modern database syncing.",
            "pricing_recommendation": "Factor in 15% contingency for legacy systems integration."
        })
    )
    db.add(analysis)

    # 3. Add Compliance Matrix matches (mock mapping to company's knowledge base)
    # Search for any compliance category knowledge node
    company_nodes = db.query(models.KnowledgeNode).filter(
        models.KnowledgeNode.company_id == rfp_in.company_id
    ).all()
    
    compliance_nodes = [n for n in company_nodes if n.category == "COMPLIANCE"]
    capability_nodes = [n for n in company_nodes if n.category == "CAPABILITY"]
    case_nodes = [n for n in company_nodes if n.category == "CASE_STUDY"]

    cm1 = models.ComplianceMatrix(
        id=str(uuid.uuid4()),
        rfp_id=db_rfp.id,
        requirement_id=reqs[0].id,
        compliance_strategy="We will deploy our standard frontend library which implements responsive dashboards.",
        matching_asset_ref=capability_nodes[0].title if capability_nodes else "Standard Capability Assets"
    )
    cm2 = models.ComplianceMatrix(
        id=str(uuid.uuid4()),
        rfp_id=db_rfp.id,
        requirement_id=reqs[1].id,
        compliance_strategy="All services follow our audited security policy, using encryption keys and SSL configurations.",
        matching_asset_ref=compliance_nodes[0].title if compliance_nodes else "SOC 2 Type II Security Standard Compliance"
    )
    cm3 = models.ComplianceMatrix(
        id=str(uuid.uuid4()),
        rfp_id=db_rfp.id,
        requirement_id=reqs[2].id,
        compliance_strategy="We will build an integration bridge, utilizing legacy migration blueprints from our past performance.",
        matching_asset_ref=case_nodes[0].title if case_nodes else "Mainframe Integration Success Case Study"
    )
    db.add_all([cm1, cm2, cm3])

    # 4. Automatically create corresponding Proposal Project workspace
    db_proposal = models.ProposalProject(
        id=str(uuid.uuid4()),
        company_id=rfp_in.company_id,
        rfp_id=db_rfp.id,
        title=f"Proposal Response - {rfp_in.title}",
        status="DRAFT"
    )
    db.add(db_proposal)
    db.commit()
    db.refresh(db_proposal)

    # Create sections for it
    s1 = models.ProposalSection(
        id=str(uuid.uuid4()),
        proposal_id=db_proposal.id,
        title="Executive Summary",
        order_index=1,
        content=f"This proposal is prepared for {rfp_in.issuer} in response to the {rfp_in.title}. We provide a comprehensive solution that fulfills all specified requirements.",
        status="DRAFT"
    )
    s2 = models.ProposalSection(
        id=str(uuid.uuid4()),
        proposal_id=db_proposal.id,
        title="Technical Solution & Integration Details",
        order_index=2,
        content="Our technology architecture uses robust cloud APIs. We will connect all location nodes via microservices, addressing key telemetry goals.",
        status="DRAFT"
    )
    s3 = models.ProposalSection(
        id=str(uuid.uuid4()),
        proposal_id=db_proposal.id,
        title="Security & Compliance Alignment",
        order_index=3,
        content="We enforce bank-grade security protocols. Encryption shields data both during network transfer and within local volumes.",
        status="DRAFT"
    )
    db.add_all([s1, s2, s3])

    # Add task log for analysis
    task = models.AgentTask(
        id=str(uuid.uuid4()),
        company_id=rfp_in.company_id,
        agent_type="RFP_ANALYZER",
        status="COMPLETED",
        payload=json.dumps({"rfp_title": rfp_in.title, "issuer": rfp_in.issuer}),
        result=json.dumps({"requirements_extracted": 3, "risk_factors_identified": 1, "win_prob": 0.8})
    )
    db.add(task)
    db.commit()

    db.refresh(db_rfp)
    return db_rfp


# --- Proposal Workspace ---
@app.get("/companies/{company_id}/proposals-enterprise/", response_model=List[schemas.ProposalProject])
def get_proposal_projects(company_id: str, db: Session = Depends(database.get_db)):
    return db.query(models.ProposalProject).filter(models.ProposalProject.company_id == company_id).all()

@app.get("/proposals-enterprise/{proposal_id}", response_model=schemas.ProposalProject)
def get_proposal_project(proposal_id: str, db: Session = Depends(database.get_db)):
    db_project = db.query(models.ProposalProject).filter(models.ProposalProject.id == proposal_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Proposal project not found")
    return db_project

@app.patch("/proposals-enterprise/{proposal_id}/sections/{section_id}", response_model=schemas.ProposalSection)
def update_proposal_section(
    proposal_id: str,
    section_id: str,
    section_update: schemas.ProposalSectionBase,
    db: Session = Depends(database.get_db)
):
    db_section = db.query(models.ProposalSection).filter(
        models.ProposalSection.proposal_id == proposal_id,
        models.ProposalSection.id == section_id
    ).first()
    if not db_section:
        raise HTTPException(status_code=404, detail="Section not found")
    
    for key, val in section_update.model_dump(exclude_unset=True).items():
        setattr(db_section, key, val)
    db.commit()
    db.refresh(db_section)
    return db_section

@app.post("/proposals-enterprise/{proposal_id}/reviews", response_model=schemas.ProposalReview)
def create_section_review(
    proposal_id: str,
    review_in: schemas.ProposalReviewCreate,
    db: Session = Depends(database.get_db)
):
    # Verify section exists
    db_section = db.query(models.ProposalSection).filter(
        models.ProposalSection.proposal_id == proposal_id,
        models.ProposalSection.id == review_in.section_id
    ).first()
    if not db_section:
        raise HTTPException(status_code=404, detail="Section not found")

    db_review = models.ProposalReview(**review_in.model_dump())
    db.add(db_review)

    # Update section status based on review status
    if review_in.status == "APPROVED":
        db_section.status = "APPROVED"
    elif review_in.status == "REJECTED":
        db_section.status = "DRAFT" # send back to draft

    db.commit()
    db.refresh(db_review)
    return db_review

@app.post("/proposals-enterprise/{proposal_id}/feedback", response_model=schemas.ProposalFeedback)
def submit_proposal_feedback(
    proposal_id: str,
    feedback_in: schemas.ProposalFeedbackCreate,
    db: Session = Depends(database.get_db)
):
    db_project = db.query(models.ProposalProject).filter(models.ProposalProject.id == proposal_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Proposal project not found")

    db_feedback = models.ProposalFeedback(**feedback_in.model_dump())
    db.add(db_feedback)

    # Update project status
    db_project.status = "WON" if feedback_in.win_loss_outcome else "LOST"

    # Launch background mock AI agent: LEARNING_AGENT
    # This represents the post-mortem analysis and learning loop weight adjustments
    outcome_str = "WIN" if feedback_in.win_loss_outcome else "LOSS"
    task = models.AgentTask(
        id=str(uuid.uuid4()),
        company_id=db_project.company_id,
        agent_type="LEARNING_AGENT",
        status="COMPLETED",
        payload=json.dumps({
            "proposal_id": proposal_id,
            "outcome": outcome_str,
            "scorecard": feedback_in.evaluator_score,
            "comments": feedback_in.evaluator_comments
        }),
        result=json.dumps({
            "message": f"Successfully completed post-mortem backpropagation. Adjusted vector weights for related capability nodes.",
            "weights_adjusted": [
                {"category": "CAPABILITY", "delta": "+0.12" if feedback_in.win_loss_outcome else "-0.05"},
                {"category": "COMPLIANCE", "delta": "+0.08" if feedback_in.win_loss_outcome else "-0.02"}
            ]
        })
    )
    db.add(task)
    db.commit()

    db.refresh(db_feedback)
    return db_feedback


# --- Competitor Intelligence ---
@app.get("/companies/{company_id}/competitors/", response_model=List[schemas.Competitor])
def get_competitors(company_id: str, db: Session = Depends(database.get_db)):
    return db.query(models.Competitor).filter(models.Competitor.company_id == company_id).all()

@app.post("/competitors/", response_model=schemas.Competitor)
def create_competitor(competitor: schemas.CompetitorCreate, db: Session = Depends(database.get_db)):
    db_comp = models.Competitor(**competitor.model_dump())
    db.add(db_comp)
    db.commit()
    db.refresh(db_comp)
    return db_comp

@app.post("/competitors/{competitor_id}/insights", response_model=schemas.CompetitorInsight)
def create_competitor_insight(
    competitor_id: str,
    insight: schemas.CompetitorInsightCreate,
    db: Session = Depends(database.get_db)
):
    db_insight = models.CompetitorInsight(**insight.model_dump())
    db.add(db_insight)
    db.commit()
    db.refresh(db_insight)
    return db_insight


# --- AI Agent Tasks Logs ---
@app.get("/companies/{company_id}/tasks/", response_model=List[schemas.AgentTask])
def get_agent_tasks(company_id: str, db: Session = Depends(database.get_db)):
    return db.query(models.AgentTask).filter(
        models.AgentTask.company_id == company_id
    ).order_index(models.AgentTask.created_at.desc()).all() if hasattr(models.AgentTask, 'order_index') else db.query(models.AgentTask).filter(
        models.AgentTask.company_id == company_id
    ).order_by(models.AgentTask.created_at.desc()).all()

@app.post("/companies/{company_id}/tasks/", response_model=schemas.AgentTask)
def trigger_agent_task(
    company_id: str,
    task_in: schemas.AgentTaskCreate,
    db: Session = Depends(database.get_db)
):
    db_task = models.AgentTask(
        id=str(uuid.uuid4()),
        company_id=company_id,
        agent_type=task_in.agent_type,
        status="PROCESSING",
        payload=task_in.payload
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    # Perform mock processing based on agent_type
    try:
        payload_data = json.loads(task_in.payload)
    except:
        payload_data = {}

    result_data = {}
    if task_in.agent_type == "RFP_ANALYZER":
        result_data = {
            "requirements_extracted": 3,
            "risk_factors_identified": 1,
            "win_prob": round(random.uniform(0.6, 0.9), 2),
            "status": "Success"
        }
    elif task_in.agent_type == "PROPOSAL_WRITER":
        result_data = {
            "generated_sections": ["Executive Summary", "Technical Architecture"],
            "word_count": 820,
            "status": "Success",
            "suggested_outline_aligned": True
        }
    elif task_in.agent_type == "COMPLIANCE_QA":
        result_data = {
            "matrix_verified": True,
            "unmapped_requirements": 0,
            "factual_consistency_score": 0.98,
            "status": "Success"
        }
    elif task_in.agent_type == "LEARNING_AGENT":
        result_data = {
            "message": "Adjusted organizational memory embeddings based on new win/loss outcome scorecards.",
            "status": "Success"
        }
    else:
        result_data = {"status": "Completed successfully"}

    db_task.status = "COMPLETED"
    db_task.result = json.dumps(result_data)
    db.commit()
    db.refresh(db_task)
    return db_task
