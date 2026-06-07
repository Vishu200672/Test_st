from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from .database import Base

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
