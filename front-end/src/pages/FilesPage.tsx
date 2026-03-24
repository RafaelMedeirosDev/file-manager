import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

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

export function FilesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const folderId = searchParams.get('folderId') ?? '';
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFilter = useMemo(() => folderId.trim().length > 0, [folderId]);

  useEffect(() => {
    async function fetchFiles() {
      setLoading(true);
      setError(null);

      try {
        const { data } = await api.get<FileItem[]>('/files', {
          params: hasFilter ? { folderId } : undefined,
        });
        setFiles(data);
      } catch (err: any) {
        const apiMessage = err?.response?.data?.message;
        setError(typeof apiMessage === 'string' ? apiMessage : 'Erro ao carregar arquivos.');
      } finally {
        setLoading(false);
      }
    }

    void fetchFiles();
  }, [folderId, hasFilter]);

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
      <h1>Arquivos</h1>

      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const nextFolderId = String(formData.get('folderId') ?? '').trim();

          if (!nextFolderId) {
            setSearchParams({});
            return;
          }

          setSearchParams({ folderId: nextFolderId });
        }}
      >
        <input name="folderId" placeholder="Filtrar por folderId" defaultValue={folderId} />
        <button type="submit">Filtrar</button>
      </form>

      {loading ? <p>Carregando...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      {!loading && !error ? (
        <ul className="item-list">
          {files.map((file) => (
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
          {files.length === 0 ? <li>Nenhum arquivo encontrado.</li> : null}
        </ul>
      ) : null}
    </div>
  );
}
