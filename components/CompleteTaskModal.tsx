import React, { useState } from 'react';
import { TaskAttachment } from '../types.ts';

interface CompleteTaskModalProps {
  onClose: () => void;
  onSubmit: (description: string, attachments: TaskAttachment[]) => void;
}

const CompleteTaskModal: React.FC<CompleteTaskModalProps> = ({ onClose, onSubmit }) => {
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    const newAttachments: TaskAttachment[] = [];

    try {
      const filesArray = Array.from(files) as File[];
      const promises = filesArray.map((file) => {
        return new Promise<TaskAttachment>((resolve, reject) => {
          const reader = new FileReader();
          
          reader.onload = (event) => {
            try {
              resolve({
                name: file.name,
                type: file.type,
                data: event.target?.result as string
              });
            } catch (error) {
              reject(error);
            }
          };
          
          reader.onerror = () => reject(new Error(`Erro ao ler arquivo ${file.name}`));
          reader.readAsDataURL(file);
        });
      });

      const results = await Promise.all(promises);
      setAttachments(prev => [...prev, ...results]);
    } catch (error) {
      console.error('Erro ao processar arquivos:', error);
      alert('Erro ao processar alguns arquivos. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    onSubmit(description, attachments);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 duration-300 border border-slate-800 flex flex-col max-h-[95dvh]">
        <div className="bg-green-700 px-5 sm:px-6 py-4 border-b border-green-800 flex justify-between items-center shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Finalizar Tarefa</h2>
          <button onClick={onClose} className="text-green-100 hover:text-white p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1" htmlFor="completionDescription">
              O que foi realizado? *
            </label>
            <textarea
              autoFocus
              required
              id="completionDescription"
              placeholder="Descreva brevemente..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all resize-none text-sm"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Anexar Provas (Fotos)
            </label>
            <div className="flex justify-center px-4 py-6 border-2 border-slate-700 border-dashed rounded-2xl hover:border-green-600/50 transition-colors cursor-pointer relative bg-slate-800/30">
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 text-slate-600" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="text-xs text-slate-400 mt-2">
                  <span className="font-black text-green-400">Selecionar Fotos</span>
                </div>
              </div>
              <input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
            </div>

            {attachments.length > 0 && (
              <div className="mt-2 grid grid-cols-1 gap-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-800 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {file.type.startsWith('image/') ? (
                        <img src={file.data} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt="" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                           <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                        </div>
                      )}
                      <span className="text-[10px] font-bold text-slate-300 truncate max-w-[150px]">{file.name}</span>
                    </div>
                    <button type="button" onClick={() => removeAttachment(index)} className="p-2 text-slate-500 hover:text-red-400">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2 mb-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase text-slate-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUploading || !description.trim()}
              className="flex-[2] py-4 rounded-2xl bg-green-600 text-white font-black text-[10px] uppercase shadow-lg shadow-green-900/20 disabled:opacity-50"
            >
              {isUploading ? 'Salvando...' : 'Finalizar Missão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompleteTaskModal;