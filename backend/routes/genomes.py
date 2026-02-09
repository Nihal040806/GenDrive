"""
Genome Routes
Handles saving and loading of trained neural network genomes.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List

from database import get_db, Genome
from schemas import SaveGenomeRequest, LoadGenomeResponse, GenomeSchema

router = APIRouter(prefix="/api/genomes", tags=["Genomes"])


@router.post("/save", response_model=dict)
async def save_genome(request: SaveGenomeRequest, db: Session = Depends(get_db)):
    """
    Save a genome to the database.
    Overwrites if genome with same name exists.
    """
    # Check if genome with name exists
    existing = db.query(Genome).filter(Genome.name == request.name).first()
    
    if existing:
        # Update existing
        existing.genome_data = request.genome.model_dump()
        existing.fitness = request.fitness
        existing.generation = request.generation
        existing.description = request.description
        db.commit()
        
        return {
            "id": existing.id,
            "message": f"Genome '{request.name}' updated successfully"
        }
    
    # Create new
    genome = Genome(
        name=request.name,
        genome_data=request.genome.model_dump(),
        fitness=request.fitness,
        generation=request.generation,
        description=request.description
    )
    
    db.add(genome)
    db.commit()
    db.refresh(genome)
    
    return {
        "id": genome.id,
        "message": f"Genome '{request.name}' saved successfully"
    }


@router.get("/load/{name}", response_model=LoadGenomeResponse)
async def load_genome(name: str, db: Session = Depends(get_db)):
    """Load a genome by name."""
    genome = db.query(Genome).filter(Genome.name == name).first()
    
    if not genome:
        raise HTTPException(status_code=404, detail=f"Genome '{name}' not found")
    
    return LoadGenomeResponse(
        id=genome.id,
        name=genome.name,
        genome=GenomeSchema(**genome.genome_data),
        fitness=genome.fitness,
        generation=genome.generation,
        description=genome.description,
        created_at=genome.created_at
    )


@router.get("/list", response_model=List[dict])
async def list_genomes(db: Session = Depends(get_db)):
    """List all saved genomes."""
    genomes = db.query(Genome).order_by(Genome.fitness.desc()).all()
    
    return [
        {
            "id": g.id,
            "name": g.name,
            "fitness": g.fitness,
            "generation": g.generation,
            "description": g.description,
            "created_at": g.created_at.isoformat()
        }
        for g in genomes
    ]


@router.delete("/{name}")
async def delete_genome(name: str, db: Session = Depends(get_db)):
    """Delete a genome by name."""
    genome = db.query(Genome).filter(Genome.name == name).first()
    
    if not genome:
        raise HTTPException(status_code=404, detail=f"Genome '{name}' not found")
    
    db.delete(genome)
    db.commit()
    
    return {"message": f"Genome '{name}' deleted successfully"}
