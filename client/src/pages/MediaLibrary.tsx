import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, Trash2, Film, ImageIcon, Search } from 'lucide-react';
import { api } from '../api/client';

interface MediaAsset {
  id: string;
  clientId: string;
  url: string;
  originalName: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  size: number;
  createdAt: string;
}

interface ClientBasic { id: string; name: string }

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function MediaLibrary() {
  const [clientId, setClientId] = useState('');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<{ data: ClientBasic[] }>('/clients'),
  });
  const clients = clientsData?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['media', clientId],
    queryFn: () => api.get<{ data: MediaAsset[] }>(`/media${clientId ? `?clientId=${clientId}` : ''}`),
  });

  const assets = (data?.data ?? []).filter(a =>
    !search || a.originalName.toLowerCase().includes(search.toLowerCase())
  );

  async function handleUpload(files: FileList | null) {
    if (!files?.length || !clientId) { toast.error('Select a client first'); return; }
    setUploading(true);
    let uploaded = 0;
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('clientId', clientId);
        await api.upload<{ data: MediaAsset }>('/media', fd);
        uploaded++;
      } catch {
        toast.error(`Failed: ${file.name}`);
      }
    }
    if (uploaded > 0) {
      qc.invalidateQueries({ queryKey: ['media', clientId] });
      toast.success(`${uploaded} file${uploaded > 1 ? 's' : ''} uploaded`);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function deleteAsset(asset: MediaAsset) {
    try {
      await api.delete(`/media/${asset.id}`);
      qc.invalidateQueries({ queryKey: ['media', clientId] });
      toast.success('Deleted');
    } catch {
      toast.error('Failed to delete');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="text-gray-500 mt-1">Images and videos for client content</p>
        </div>
        <button
          onClick={() => clientId ? fileInputRef.current?.click() : toast.error('Select a client first')}
          disabled={uploading}
          className="btn-primary flex items-center gap-2"
        >
          <Upload size={16} />
          {uploading ? 'Uploading…' : 'Upload Files'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={e => handleUpload(e.target.files)}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={clientId}
          onChange={e => setClientId(e.target.value)}
          className="input w-48"
        >
          <option value="">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files…"
            className="input pl-9 w-56"
          />
        </div>
        <span className="self-center text-sm text-gray-500">{assets.length} file{assets.length !== 1 ? 's' : ''}</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : assets.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
          onClick={() => clientId ? fileInputRef.current?.click() : toast.error('Select a client first')}
        >
          <Upload size={36} className="text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No media yet</p>
          <p className="text-sm text-gray-400 mt-1">Select a client and click Upload Files</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {assets.map(asset => {
            const isVideo = asset.mimeType.startsWith('video/');
            return (
              <div key={asset.id} className="group relative rounded-xl overflow-hidden bg-gray-50 border border-gray-100 hover:shadow-md transition-shadow">
                <div className="aspect-square">
                  {isVideo ? (
                    <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center">
                      <Film size={28} className="text-gray-400" />
                    </div>
                  ) : (
                    <img src={asset.url} alt={asset.originalName} className="w-full h-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs text-gray-700 font-medium truncate">{asset.originalName}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatBytes(asset.size)}{asset.width ? ` · ${asset.width}×${asset.height}` : ''}</p>
                </div>
                <button
                  onClick={() => deleteAsset(asset)}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  <Trash2 size={12} className="text-white" />
                </button>
                {isVideo && (
                  <div className="absolute top-2 left-2 bg-black/60 rounded-full px-1.5 py-0.5">
                    <Film size={10} className="text-white" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Upload tile */}
          {clientId && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
            >
              <ImageIcon size={24} className="text-gray-300 mb-1" />
              <p className="text-xs text-gray-400">Upload</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
