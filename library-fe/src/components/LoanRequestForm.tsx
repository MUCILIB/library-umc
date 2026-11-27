import { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Calendar, FileText, X } from 'lucide-react';

interface LoanRequestFormProps {
  isOpen: boolean;
  collectionTitle: string;
  collectionAuthor: string;
  onSubmit: (formData: { loanDate: string; dueDate: string; notes: string }) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

const LoanRequestForm = ({
  isOpen,
  collectionTitle,
  collectionAuthor,
  onSubmit,
  onClose,
  isLoading = false
}: LoanRequestFormProps) => {
  const [loanFormData, setLoanFormData] = useState({
    loanDate: '',
    dueDate: '',
    notes: ''
  });
  
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    show: false,
    message: '',
    type: 'success'
  });

  const getLocalTodayYmd = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayYmd = getLocalTodayYmd();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setLoanFormData({ ...loanFormData, [e.target.name]: e.target.value });
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 5000);
  };

  const handleSubmit = async () => {
    if (!loanFormData.loanDate || !loanFormData.dueDate) {
      showNotification('Pilih tanggal peminjaman dan pengembalian', 'error');
      return;
    }

    const start = new Date(`${loanFormData.loanDate}T00:00:00`);
    const end = new Date(`${loanFormData.dueDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      showNotification('Tanggal peminjaman tidak boleh kurang dari hari ini', 'error');
      return;
    }

    if (start > today) {
      showNotification('Tanggal peminjaman tidak boleh melebihi tanggal saat ini', 'error');
      return;
    }

    if (end <= start) {
      showNotification('Tanggal pengembalian harus setelah tanggal peminjaman', 'error');
      return;
    }

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    if (diffDays > 7) {
      showNotification('Maksimal peminjaman 7 hari', 'error');
      return;
    }

    try {
      await onSubmit(loanFormData);
      setLoanFormData({ loanDate: '', dueDate: '', notes: '' });
      onClose();
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : 'Terjadi kesalahan saat mengajukan peminjaman',
        'error'
      );
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setLoanFormData({ loanDate: '', dueDate: '', notes: '' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-6 right-6 z-[60] p-4 rounded-xl shadow-2xl border transition-all duration-300 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
          notification.type === 'success' ? 'bg-white border-green-200' :
          notification.type === 'error' ? 'bg-white border-primary' :
          'bg-white border-blue-200'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle size={20} className="text-green-600" />
          ) : notification.type === 'error' ? (
            <XCircle size={20} className="text-primary" />
          ) : (
            <AlertCircle size={20} className="text-blue-600" />
          )}
          <p className="text-sm font-semibold text-foreground">
            {notification.message}
          </p>
        </div>
      )}

      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-hidden">
        {/* Modal Container */}
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="p-6 border-b border-border flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-foreground">Form Peminjaman</h3>
              <p className="text-xs text-muted-foreground mt-1">Silakan lengkapi data peminjaman buku</p>
            </div>
            <button 
              onClick={handleClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Info Buku - High Contrast */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Detail Koleksi</span>
              <p className="font-bold text-foreground text-lg leading-tight mt-1">{collectionTitle}</p>
              <p className="text-sm text-foreground font-medium">{collectionAuthor}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tanggal Peminjaman */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Calendar size={16} className="text-primary" />
                  Mulai Pinjam
                </label>
                <input
                  type="date"
                  name="loanDate"
                  value={loanFormData.loanDate}
                  onChange={handleInputChange}
                  min={todayYmd}
                  max={todayYmd}
                  className="w-full px-4 py-3 bg-white border-2 border-border rounded-xl text-foreground font-medium focus:border-primary/20 focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                  required
                />
              </div>

              {/* Tanggal Pengembalian */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Calendar size={16} className="text-primary" />
                  Kembali (Maks 7 Hari)
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={loanFormData.dueDate}
                  onChange={handleInputChange}
                  min={loanFormData.loanDate || new Date().toISOString().split('T')[0]}
                  max={
                    loanFormData.loanDate
                      ? new Date(new Date(loanFormData.loanDate).getTime() + 7 * 24 * 60 * 60 * 1000)
                          .toISOString()
                          .split('T')[0]
                      : undefined
                  }
                  className="w-full px-4 py-3 bg-white border-2 border-border rounded-xl text-foreground font-medium focus:border-primary/20 focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Catatan */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                <FileText size={16} className="text-primary" />
                Catatan (Opsional)
              </label>
              <textarea
                name="notes"
                value={loanFormData.notes}
                onChange={handleInputChange}
                placeholder="Contoh: Untuk keperluan penelitian..."
                className="w-full px-4 py-3 bg-white border-2 border-border rounded-xl text-foreground font-medium focus:border-primary/20 focus:ring-4 focus:ring-primary/10 outline-none transition-all resize-none"
                rows={3}
              />
            </div>

            {/* Info Box */}
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
              <h4 className="text-xs font-bold text-amber-800 uppercase mb-2 tracking-wide">Ketentuan:</h4>
              <ul className="text-xs text-amber-900/80 space-y-1.5 font-medium">
                <li className="flex items-center gap-2">• Maksimal durasi peminjaman 7 hari</li>
                <li className="flex items-center gap-2">• Denda keterlambatan Rp 500 / hari</li>
                <li className="flex items-center gap-2">• Pastikan data sudah benar sebelum mengirim</li>
              </ul>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-border flex gap-3 bg-slate-50/50">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border-2 border-border rounded-xl text-sm font-bold text-foreground hover:bg-white hover:border-slate-300 transition-all disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-[2] bg-primary text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-primary/90 active:scale-[0.98] disabled:bg-slate-400 shadow-lg shadow-primary transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memproses...
                </>
              ) : 'Ajukan Peminjaman'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoanRequestForm;