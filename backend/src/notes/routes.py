from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.auth.routes import get_current_user
from src.db.database import get_db, Note, Session, User

router = APIRouter()

VALID_TAGS = {"finding", "evidence", "todo", "ioc", "remediation", "note"}


class NoteCreate(BaseModel):
    session_id: str
    tag: str
    content: str
    phase: int = 1


@router.post("/")
async def create_note(
    body: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if body.tag not in VALID_TAGS:
        raise HTTPException(status_code=400, detail=f"tag must be one of {VALID_TAGS}")

    # Verify session belongs to user
    result = await db.execute(
        select(Session).where(Session.id == body.session_id, Session.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    note = Note(
        session_id=body.session_id,
        tag=body.tag,
        content=body.content,
        phase=body.phase,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return _note_dict(note)


@router.get("/{session_id}")
async def list_notes(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(
        select(Note).where(Note.session_id == session_id).order_by(Note.created_at)
    )
    return [_note_dict(n) for n in result.scalars()]


@router.delete("/{note_id}")
async def delete_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Verify ownership via session
    sess_result = await db.execute(
        select(Session).where(Session.id == note.session_id, Session.user_id == current_user.id)
    )
    if not sess_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not your note")

    await db.delete(note)
    await db.commit()
    return {"deleted": note_id}


def _note_dict(n: Note) -> dict:
    return {
        "id": n.id,
        "session_id": n.session_id,
        "tag": n.tag,
        "content": n.content,
        "phase": n.phase,
        "created_at": n.created_at.isoformat(),
    }
