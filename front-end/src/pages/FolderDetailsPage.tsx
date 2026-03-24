import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<FolderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    async function fetchFolder() {
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
    }

    void fetchFolder();
  }, [id]);

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
              <Link to={`/folders/${folder.parent.id}`}>Ir para pasta pai</Link>
            ) : null}
          </div>

          <h2>Subpastas</h2>
          <ul className="item-list">
            {folder.children.map((child) => (
              <li key={child.id}>
                <Link to={`/folders/${child.id}`}>{child.name}</Link>
              </li>
            ))}
            {folder.children.length === 0 ? <li>Sem subpastas.</li> : null}
          </ul>

          <h2>Arquivos</h2>
          <ul className="item-list">
            {folder.files.map((file) => (
              <li key={file.id}>
                <span>
                  {file.name}.{file.extension}
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
        </>
      ) : null}
    </div>
  );
}
