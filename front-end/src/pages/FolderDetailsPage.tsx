import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

type FolderChild = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
};

type FileItem = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
  extension: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

type FolderDetails = {
  id: string;
  name: string;
  userId: string;
  folderId: string | null;
  parent: FolderChild | null;
  children: FolderChild[];
  files: FileItem[];
  createdAt: string;
  updatedAt: string;
};

export function FolderDetailsPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<FolderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newFileExtension, setNewFileExtension] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');

  const fetchFolder = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get<FolderDetails>(`/folders/${id}`);
      setFolder(data);
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message;
      setError(typeof apiMessage === 'string' ? apiMessage : 'Erro ao carregar pasta.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchFolder();
  }, [fetchFolder]);

  async function handleDownload(fileId: string, fileName: string, extension: string) {
    const response = await api.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${fileName}.${extension}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  }

  async function handleCreateSubFolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !id) {
      return;
    }

    await api.post('/folders', {
      name: newFolderName,
      userId: user.id,
      folderId: id,
    });

    setNewFolderName('');
    await fetchFolder();
  }

  async function handleCreateFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !id) {
      return;
    }

    await api.post('/files', {
      name: newFileName,
      userId: user.id,
      folderId: id,
      extension: newFileExtension,
      url: newFileUrl,
    });

    setNewFileName('');
    setNewFileExtension('');
    setNewFileUrl('');
    await fetchFolder();
  }

  return (
    <div>
      {loading ? <p>Carregando...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      {folder && !loading ? (
        <>
          <h1>{folder.name}</h1>

          <div className="actions-row">
            <button type="button" onClick={() => navigate('/folders')}>
              Voltar para raiz
            </button>
            {folder.parent ? (
              <Link to={`/folders/${folder.parent.id}`}>Pasta pai</Link>
            ) : null}
          </div>

          <div className="explorer-layout">
            <aside className="explorer-tree">
              <h2>Navegacao</h2>
              <ul className="item-list compact">
                <li>
                  <Link to="/folders">Desktop (raiz)</Link>
                </li>
                {folder.parent ? (
                  <li>
                    <Link to={`/folders/${folder.parent.id}`}>? {folder.parent.name}</Link>
                  </li>
                ) : null}
                {folder.children.map((child) => (
                  <li key={`tree-${child.id}`}>
                    <Link to={`/folders/${child.id}`}>?? {child.name}</Link>
                  </li>
                ))}
              </ul>
            </aside>

            <section className="explorer-content">
              <h2>Conteudo da pasta</h2>

              {user?.role === 'ADMIN' ? (
                <div className="admin-tools-grid">
                  <form className="inline-form" onSubmit={handleCreateSubFolder}>
                    <input
                      placeholder="Nova subpasta"
                      value={newFolderName}
                      onChange={(event) => setNewFolderName(event.target.value)}
                      required
                    />
                    <button type="submit">Criar pasta</button>
                  </form>

                  <form className="inline-form" onSubmit={handleCreateFile}>
                    <input
                      placeholder="Nome do arquivo"
                      value={newFileName}
                      onChange={(event) => setNewFileName(event.target.value)}
                      required
                    />
                    <input
                      placeholder="Extensao (ex: pdf)"
                      value={newFileExtension}
                      onChange={(event) => setNewFileExtension(event.target.value)}
                      required
                    />
                    <input
                      placeholder="URL do arquivo"
                      value={newFileUrl}
                      onChange={(event) => setNewFileUrl(event.target.value)}
                      required
                    />
                    <button type="submit">Criar arquivo</button>
                  </form>
                </div>
              ) : null}

              <h3>Subpastas</h3>
              <ul className="item-list">
                {folder.children.map((child) => (
                  <li key={child.id}>
                    <Link to={`/folders/${child.id}`}>?? {child.name}</Link>
                  </li>
                ))}
                {folder.children.length === 0 ? <li>Sem subpastas.</li> : null}
              </ul>

              <h3>Arquivos</h3>
              <ul className="item-list">
                {folder.files.map((file) => (
                  <li key={file.id}>
                    <span>
                      ?? {file.name}.{file.extension}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDownload(file.id, file.name, file.extension)}
                    >
                      Download
                    </button>
                  </li>
                ))}
                {folder.files.length === 0 ? <li>Sem arquivos.</li> : null}
              </ul>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
