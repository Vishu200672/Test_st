from pydantic import BaseModel
from typing import List, Optional

class ProposalBase(BaseModel):
    title: str
    content: str
    status: str = "draft"

class ProposalCreate(ProposalBase):
    client_id: int

class Proposal(ProposalBase):
    id: int
    client_id: int

    class Config:
        from_attributes = True

class ClientBase(BaseModel):
    name: str
    industry: str
    preferences: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    id: int
    proposals: List[Proposal] = []

    class Config:
        from_attributes = True

class ProposalGenerateRequest(BaseModel):
    client_id: int
    topic: str
