"""
Database Module
SQLite database setup with SQLAlchemy for genome and history persistence.
"""

from sqlalchemy import create_engine, Column, Integer, Float, String, Text, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'simulation.db')
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# Create engine
engine = create_engine(f'sqlite:///{DB_PATH}', echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Genome(Base):
    """Stored neural network genomes (best agents)."""
    __tablename__ = 'genomes'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    genome_data = Column(JSON, nullable=False)  # Serialized neural network
    fitness = Column(Float, nullable=False)
    generation = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class GenerationLog(Base):
    """Historical log of generation performance."""
    __tablename__ = 'generation_logs'
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(50), index=True)  # Group logs by simulation session
    generation = Column(Integer, nullable=False)
    best_fitness = Column(Float, nullable=False)
    average_fitness = Column(Float, nullable=False)
    worst_fitness = Column(Float, nullable=False)
    mutation_rate = Column(Float, nullable=False)
    population_size = Column(Integer, nullable=False)
    evolution_time_ms = Column(Float, nullable=True)  # Time to compute evolution
    timestamp = Column(DateTime, default=datetime.utcnow)


class SimulationSession(Base):
    """Track simulation sessions for analytics."""
    __tablename__ = 'simulation_sessions'
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(50), unique=True, index=True)
    config = Column(JSON, nullable=False)  # Simulation configuration
    total_generations = Column(Integer, default=0)
    best_fitness_achieved = Column(Float, default=0.0)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Initialize on import
init_db()
