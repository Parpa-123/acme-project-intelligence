import { useState, useCallback, Fragment } from 'react';
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import toast from 'react-hot-toast';
import { useProjectDocuments, useUploadDocument, useDeleteDocument } from '../../../api/projects';
import { Badge } from '../../../components/ui/Badge';
import { FaFileAlt, FaUpload, FaSpinner, FaFilePdf, FaFileWord, FaFileCode, FaExclamationCircle, FaCheckCircle, FaFolderOpen, FaTrash } from 'react-icons/fa';

interface ProjectDocumentsTabProps {
  projectId: number;
}

export function ProjectDocumentsTab({ projectId }: ProjectDocumentsTabProps) {
  const { data: documents, isLoading, error } = useProjectDocuments(projectId);
  const uploadDoc = useUploadDocument(projectId);
  const deleteDoc = useDeleteDocument(projectId);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setUploadError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      try {
        await uploadDoc.mutateAsync(file);
        toast.success('Document uploaded successfully!');
      } catch (err: any) {
        setUploadError(err.message || 'Failed to upload document');
        toast.error(err.message || 'Failed to upload document');
      }
    }
  }, [uploadDoc]);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        await uploadDoc.mutateAsync(file);
        toast.success('Document uploaded successfully!');
      } catch (err: any) {
        setUploadError(err.message || 'Failed to upload document');
        toast.error(err.message || 'Failed to upload document');
      }
    }
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return <FaFilePdf className="text-red-400" size={24} />;
    if (type.includes('doc')) return <FaFileWord className="text-blue-400" size={24} />;
    if (type.includes('txt') || type.includes('md') || type.includes('json') || type.includes('csv')) return <FaFileCode className="text-gray-400" size={24} />;
    return <FaFileAlt className="text-indigo-400" size={24} />;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-indigo-300">
        <FaSpinner className="animate-spin mb-4" size={32} />
        <p>Loading documents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between text-red-200">
        <p className="text-sm">Failed to load documents.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 shadow-sm border border-white/5">
        <h2 className="text-xl font-bold text-white text-glow-sm flex items-center gap-2 mb-2">
          <FaFileAlt className="text-indigo-400" /> Project Knowledge Base
        </h2>
        <p className="text-sm text-gray-400">
          Upload documents, PDFs, or specs. They will be processed and become searchable context for the AI Copilot.
        </p>
      </div>

      {/* Upload Zone */}
      <div 
        className={`glass-panel border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all duration-300 ${
          dragActive 
            ? 'border-indigo-400 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.2)] scale-[1.01]' 
            : 'border-white/20 hover:border-indigo-500/50 hover:bg-white/5'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4">
          <FaUpload className="text-indigo-400" size={24} />
        </div>
        <p className="text-white font-medium mb-1">Drag and drop your file here</p>
        <p className="text-gray-400 text-sm mb-6">Supports PDF, DOCX, TXT (Max 10MB)</p>
        
        <input 
          type="file"
          id="doc-upload"
          className="hidden"
          onChange={handleChange}
          disabled={uploadDoc.isPending}
        />
        <label 
          htmlFor="doc-upload"
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            uploadDoc.isPending
              ? 'bg-indigo-500/50 text-white/70 cursor-not-allowed flex items-center gap-2'
              : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]'
          }`}
        >
          {uploadDoc.isPending ? (
            <><FaSpinner className="animate-spin" /> Uploading...</>
          ) : (
            'Select File'
          )}
        </label>
        
        {uploadError && (
          <p className="text-red-400 text-sm mt-4">{uploadError}</p>
        )}
      </div>

      {/* Documents Roster */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white text-glow-sm flex items-center gap-2">
          Uploaded Documents <Badge variant="secondary">{documents?.length || 0}</Badge>
        </h3>
        
        {(!documents || documents.length === 0) ? (
          <div className="border border-dashed border-white/20 rounded-xl p-12 flex flex-col items-center justify-center text-center bg-white/5 backdrop-blur-md">
            <FaFolderOpen className="text-gray-600 mb-3" size={40} />
            <p className="text-gray-400">No documents uploaded yet.</p>
            <p className="text-xs text-gray-500 mt-1">Files uploaded here will appear in this list.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div 
                key={doc.id}
                className="glass-panel p-4 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white-[0.02] transition-all duration-300 flex items-start gap-4 group"
              >
                <div className="mt-1 p-2 bg-black/20 rounded-lg group-hover:scale-110 transition-transform">
                  {getFileIcon(doc.file_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium truncate" title={doc.filename}>{doc.filename}</h4>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="uppercase">{doc.file_type || 'Unknown'}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {doc.status === 'processing' && (
                    <Badge variant="outline" className="border-yellow-500/50 text-yellow-300 bg-yellow-500/10 flex items-center gap-1.5 whitespace-nowrap">
                      <FaSpinner className="animate-spin text-xs" /> Processing
                    </Badge>
                  )}
                  {doc.status === 'ready' && (
                    <Badge variant="outline" className="border-emerald-500/50 text-emerald-300 bg-emerald-500/10 flex items-center gap-1.5 whitespace-nowrap">
                      <FaCheckCircle className="text-xs" /> Ready
                    </Badge>
                  )}
                  {doc.status === 'error' && (
                    <Badge variant="outline" className="border-red-500/50 text-red-300 bg-red-500/10 flex items-center gap-1.5 whitespace-nowrap">
                      <FaExclamationCircle className="text-xs" /> Failed
                    </Badge>
                  )}
                  {doc.status === 'deleting' && (
                    <Badge variant="outline" className="border-gray-500/50 text-gray-400 bg-gray-500/10 flex items-center gap-1.5 whitespace-nowrap">
                      <FaSpinner className="animate-spin text-xs" /> Deleting
                    </Badge>
                  )}
                </div>
                
                <button
                  onClick={() => setDocToDelete(doc.id)}
                  disabled={deleteDoc.isPending || doc.status === 'deleting'}
                  className="p-2 ml-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete Document"
                >
                  <FaTrash />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Transition show={!!docToDelete} as={Fragment}>
        <HeadlessDialog as="div" className="relative z-50" onClose={() => setDocToDelete(null)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <HeadlessDialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#1A1A1A] p-6 text-left align-middle shadow-xl transition-all border border-white/10">
                  <HeadlessDialog.Title as="h3" className="text-lg font-bold leading-6 text-white flex items-center gap-2">
                    <FaTrash className="text-red-400" /> Delete Document
                  </HeadlessDialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-400">
                      Are you sure you want to delete this document? This action cannot be undone and it will be removed from the project knowledge base.
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-colors"
                      onClick={() => setDocToDelete(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-xl border border-transparent bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30 border-red-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 transition-colors"
                      onClick={() => {
                        if (docToDelete) {
                          deleteDoc.mutate(docToDelete, {
                            onSuccess: () => {
                              toast.success('Document deleted successfully!');
                              setDocToDelete(null);
                            },
                            onError: (err: any) => {
                              toast.error(err.message || 'Failed to delete document');
                              setDocToDelete(null);
                            }
                          });
                        }
                      }}
                      disabled={deleteDoc.isPending}
                    >
                      {deleteDoc.isPending ? <FaSpinner className="animate-spin" /> : 'Delete Document'}
                    </button>
                  </div>
                </HeadlessDialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </HeadlessDialog>
      </Transition>
    </div>
  );
}
