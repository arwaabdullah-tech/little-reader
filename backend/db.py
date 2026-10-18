"""Database models (SQLAlchemy). SQLite by default, kept in the Docker volume."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from . import config

engine = create_engine(
    config.DATABASE_URL,
    connect_args={'check_same_thread': False} if config.DATABASE_URL.startswith('sqlite:') else {},
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()


def new_id() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = 'users'
    id = Column(String, primary_key=True, default=new_id)
    email = Column(String, unique=True, index=True, nullable=True)  # empty for quick-start guests
    password_hash = Column(String, nullable=True)
    is_guest = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Child(Base):
    __tablename__ = 'children'
    id = Column(String, primary_key=True, default=new_id)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    name = Column(String(60), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(1), default='f')            # 'm' or 'f' (drives Arabic grammar)
    language = Column(String(5), default='ar')
    reading_level = Column(Integer, default=2)          # ladder: 1 كلمتي, 2 جملتي, 3 فقرتي, 4 صفحتي
    ladder_progress = Column(Integer, default=0)        # 0..100 towards the next step
    avatar_path = Column(String, nullable=True)         # cartoon only; the original photo is never stored
    avatar_source = Column(String, nullable=True)       # 'ai' or 'local'
    bedtime = Column(String(5), default='20:00')
    consent_at = Column(DateTime, nullable=True)
    sleep_until = Column(DateTime, nullable=True)       # UTC; no new book before this
    created_at = Column(DateTime, default=datetime.utcnow)


class Story(Base):
    __tablename__ = 'stories'
    id = Column(String, primary_key=True, default=new_id)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    child_id = Column(String, ForeignKey('children.id'), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)              # JSON: pages, bridges, words, mission, ...
    source = Column(String(10), default='ai')           # 'ai' or 'demo' (backup story)
    cover_path = Column(String, nullable=True)
    cover_status = Column(String(10), default='none')   # none | pending | ready | failed
    created_at = Column(DateTime, default=datetime.utcnow)


class Reading(Base):
    __tablename__ = 'readings'
    id = Column(String, primary_key=True, default=new_id)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    child_id = Column(String, ForeignKey('children.id'), nullable=False, index=True)
    story_id = Column(String, ForeignKey('stories.id'), nullable=False, index=True)
    minutes = Column(Integer, default=0)
    child_lines = Column(Integer, default=0)            # lines the child read (self-reported)
    words_read = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Alert(Base):
    """A private note for the parent when a child's answers sounded worrying (no story was written)."""
    __tablename__ = 'alerts'
    id = Column(String, primary_key=True, default=new_id)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, index=True)
    child_id = Column(String, ForeignKey('children.id'), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(engine)
