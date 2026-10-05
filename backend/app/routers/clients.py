from fastapi import APIRouter, Depends, HTTPException, Response
from sqlmodel import Session, select

from ..auth import current_user
from ..db import get_session
from ..models import Client, User
from ..schemas import ClientIn, ClientOut
from ..services import client_out

router = APIRouter(prefix="/clients", tags=["clients"])


def _owned(session: Session, user: User, client_id: int) -> Client:
    c = session.get(Client, client_id)
    if not c or c.user_id != user.id:
        raise HTTPException(404, "Client not found")
    return c


@router.get("", response_model=list[ClientOut])
def list_clients(include_archived: bool = False, user: User = Depends(current_user),
                 session: Session = Depends(get_session)):
    q = select(Client).where(Client.user_id == user.id)
    if not include_archived:
        q = q.where(Client.archived == False)  # noqa: E712
    return [client_out(c) for c in session.exec(q.order_by(Client.name)).all()]


@router.post("", response_model=ClientOut, status_code=201)
def create_client(body: ClientIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
    c = Client(user_id=user.id, **body.model_dump())
    session.add(c)
    session.commit()
    session.refresh(c)
    return client_out(c)


@router.put("/{client_id}", response_model=ClientOut)
def update_client(client_id: int, body: ClientIn, user: User = Depends(current_user),
                  session: Session = Depends(get_session)):
    c = _owned(session, user, client_id)
    for k, v in body.model_dump().items():
        setattr(c, k, v)
    session.add(c)
    session.commit()
    session.refresh(c)
    return client_out(c)


@router.post("/{client_id}/archive", response_model=ClientOut)
def archive_client(client_id: int, user: User = Depends(current_user), session: Session = Depends(get_session)):
    c = _owned(session, user, client_id)
    c.archived = True
    session.add(c)
    session.commit()
    session.refresh(c)
    return client_out(c)


@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: int, user: User = Depends(current_user), session: Session = Depends(get_session)):
    c = _owned(session, user, client_id)
    if c.invoices:
        raise HTTPException(409, "This client has invoices; archive it instead")
    session.delete(c)
    session.commit()
    return Response(status_code=204)
