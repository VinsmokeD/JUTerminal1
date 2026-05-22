"""Add metadata column to sessions table

Revision ID: 005_add_session_metadata
Revises: 004_add_containment
Create Date: 2026-05-22 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005_add_session_metadata'
down_revision: Union[str, None] = '004_add_containment'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sessions', sa.Column('metadata', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('sessions', 'metadata')
