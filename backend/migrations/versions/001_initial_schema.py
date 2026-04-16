"""Initial schema from models.

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-04-16 11:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False, server_default='student'),
        sa.Column('skill_level', sa.String(length=20), nullable=False, server_default='beginner'),
        sa.Column('onboarding_completed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username')
    )

    # Create sessions table
    op.create_table(
        'sessions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('scenario_id', sa.String(length=10), nullable=False),
        sa.Column('role', sa.String(length=10), nullable=False),
        sa.Column('methodology', sa.String(length=50), nullable=False, server_default='ptes'),
        sa.Column('ai_mode', sa.String(length=20), nullable=False, server_default='learn'),
        sa.Column('phase', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('score', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('hints_used', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('roe_acknowledged', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('container_id', sa.String(), nullable=True),
        sa.Column('network_name', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create notes table
    op.create_table(
        'notes',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=False),
        sa.Column('tag', sa.String(length=20), nullable=False),
        sa.Column('content', sa.String(), nullable=False),
        sa.Column('phase', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create command_log table
    op.create_table(
        'command_log',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=False),
        sa.Column('command', sa.String(), nullable=False),
        sa.Column('tool', sa.String(length=50), nullable=True),
        sa.Column('phase', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('triggered_siem_events', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('ai_hint_given', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create siem_events table
    op.create_table(
        'siem_events',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=False),
        sa.Column('severity', sa.String(length=10), nullable=False),
        sa.Column('message', sa.String(), nullable=False),
        sa.Column('raw_log', sa.String(), nullable=True),
        sa.Column('mitre_technique', sa.String(length=20), nullable=True),
        sa.Column('source_ip', sa.String(length=45), nullable=True),
        sa.Column('source', sa.String(length=50), nullable=False, server_default='attacker'),
        sa.Column('acknowledged', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create auto_evidence table
    op.create_table(
        'auto_evidence',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=False),
        sa.Column('command', sa.String(), nullable=False),
        sa.Column('output_summary', sa.String(), nullable=False),
        sa.Column('tool_name', sa.String(length=50), nullable=True),
        sa.Column('tag', sa.String(length=20), nullable=False, server_default='evidence'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create siem_triage table
    op.create_table(
        'siem_triage',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=False),
        sa.Column('event_id', sa.String(length=100), nullable=False),
        sa.Column('classification', sa.String(length=20), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('siem_triage')
    op.drop_table('auto_evidence')
    op.drop_table('siem_events')
    op.drop_table('command_log')
    op.drop_table('notes')
    op.drop_table('sessions')
    op.drop_table('users')
