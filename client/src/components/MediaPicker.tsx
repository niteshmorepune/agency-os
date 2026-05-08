import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Upload, Check, Trash2, ImageIcon, Film } from 'lucide-react';
import { api } from '../api/client';

interface MediaAsset {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  size: number;
  createdAt: string;
}

interface Props {
  clientId: string;
  selected: string[];
  onConfirm: (urls: string[]) => void;
  onClose: () => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function MediaPicker({ clientId, selected, onConfirm, onClose }: Props) {
  const [localSelected, setLocalSelected] = useState<string[]>(selected);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['media', clientId],
    queryFn: () => api.get<{ data: MediaAsset[] }>(`/media?clientId=${clientId}`),
    enabled: !!clientId,
  });

  const assets = data?.data ?? [];

  function toggle(url: string) {
    setLocalSelected(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    let uploaded = 0;
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('clientId', clientId);
        const res = await api.upload<{ data: MediaAsset }>('/media', fd);
        setLocalSelected(prev => [...prev, res.data.url]);
        uploaded++;
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    if (uploaded > 0) {
      qc.invalidateQueries({ queryKey: ['media', clientId] });
      toast.success(`${uploaded} file${uploaded > 1 ? 's' : ''} uploaded`);
    }
    setUploading(false);
  }

  async function deleteAsset(asset: MediaAsset, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await api.delete(`/media/${asset.id}`);
      qc.invalidateQueries({ queryKey: ['media', clientId] });
      setLocalSelected(prev => prev.filter(u => u !== asset.url));
      toast.success('File deleted');
    } catch {
      toast.error('Failed to delete file');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Media Library</h2>
            <p className="text-xs text-gray-500 mt-0.5">{localSelected.length} selected</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <Upload size={14} />
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
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : assets.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} className="text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 font-medium">Click to upload media</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF, WebP, MP4 — max 20 MB</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {assets.map(asset => {
                const isVideo = asset.mimeType.startsWith('video/');
                const isSelected = localSelected.includes(asset.url);
                return (
                  <div
                    key={asset.id}
                    onClick={() => toggle(asset.url)}
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all group ${isSelected ? 'border-primary-500 ring-2 ring-primary-200' : 'border-transparent hover:border-gray-300'}`}
                  >
                    {isVideo ? (
                      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                        <Film size={28} className="text-gray-400" />
                        <p className="absolute bottom-1 left-1 right-1 text-[10px] text-gray-300 text-center truncate px-1">{asset.originalName}</p>
                      </div>
                    ) : (
                      <img src={asset.url} alt={asset.originalName} className="w-full h-full object-cover" loading="lazy" />
                    )}

                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                        <Check size={11} className="text-white" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    <button
                      onClick={e => deleteAsset(asset, e)}
                      className="absolute top-1.5 left-1.5 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={11} className="text-white" />
                    </button>
                    <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatBytes(asset.size)}
                    </p>
                  </div>
                );
              })}

              {/* Upload tile */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
              >
                <ImageIcon size={20} className="text-gray-300 mb-1" />
                <p className="text-[10px] text-gray-400">Add more</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500">{localSelected.length} of {assets.length} selected</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => { onConfirm(localSelected); onClose(); }} className="btn-primary">
              Add to Post ({localSelected.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
