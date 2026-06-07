from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from . import models, schemas, database

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Proposal & RFP Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Proposal & RFP Agent API"}

# Clients
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

# Proposals
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

# Organizational Memory Logic
@app.post("/generate-proposal/")
def generate_proposal(request: schemas.ProposalGenerateRequest, db: Session = Depends(database.get_db)):
    client = db.query(models.Client).filter(models.Client.id == request.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Find past successful proposals for this client or industry
    past_proposals = db.query(models.Proposal).join(models.Client).filter(
        (models.Proposal.status == "won") &
        ((models.Proposal.client_id == client.id) | (models.Client.industry == client.industry))
    ).all()

    memory_context = []
    for p in past_proposals:
        memory_context.append(f"Past Successful Proposal ({p.title}): {p.content[:200]}...")

    client_prefs = f"Client Preferences: {client.preferences}" if client.preferences else "No specific preferences recorded."

    # Mock AI Generation using Organizational Memory
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
