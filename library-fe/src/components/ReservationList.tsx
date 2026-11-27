import { useState, useEffect, useCallback, useRef } from 'react';
import { X, BookOpen, Calendar, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import reservationService, { type Reservation } from '@/services/reservationService';
import { useToast } from '@/hooks/useToast';



interface ReservationListProps {
  isOpen: boolean;
  onClose: () => void;
  memberId?: string; // ID member yang login
}

const ReservationList = ({ isOpen, onClose, memberId }: ReservationListProps) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'waiting' | 'fulfilled' | 'canceled'>('all');
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const fetchUserReservations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await reservationService.getMyReservations();
      setReservations(data);
      
    } catch (error) {
      console.error('Error fetching reservations:', error);
      const errMsg = error instanceof Error ? error.message : 'Gagal memuat daftar reservasi';
      setError(errMsg);
      toastRef.current.error('Gagal', errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCancel = async (reservationId: string) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan reservasi ini?')) return;

    try {
      const loadingId = toast.loading('Memproses', 'Membatalkan reservasi...');
      await reservationService.cancelReservation(reservationId);
      toast.removeToast(loadingId);
      toast.success('Berhasil', 'Reservasi telah dibatalkan');
      fetchUserReservations(); // Refresh list
    } catch (error) {
      toast.error('Gagal', error instanceof Error ? error.message : 'Terjadi kesalahan saat membatalkan reservasi');
    }
  };

  useEffect(() => {
    if (isOpen && memberId) {
      fetchUserReservations();
    }
  }, [isOpen, memberId, fetchUserReservations]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      waiting: { 
        bg: 'bg-yellow-50', 
        text: 'text-yellow-600', 
        label: 'Menunggu Konfirmasi', 
        icon: Clock 
      },
      fulfilled: { 
        bg: 'bg-green-50', 
        text: 'text-green-600', 
        label: 'Tersedia — Diajukan Pinjam', 
        icon: CheckCircle 
      },
      canceled: { 
        bg: 'bg-accent', 
        text: 'text-primary', 
        label: 'Dibatalkan', 
        icon: XCircle 
      },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.waiting;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${config.bg} ${config.text}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  const getStatusText = (status: string) => {
    const statusMap = {
      waiting: 'Menunggu Stok Tersedia',
      fulfilled: 'Dialihkan ke Pengajuan Peminjaman',
      canceled: 'Dibatalkan'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const filteredReservations = reservations.filter(res => {
    if (activeTab === 'all') return true;
    return res.status === activeTab;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-card rounded-[32px] w-full max-w-2xl shadow-2xl">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="text-xl font-extrabold text-foreground">Daftar Reservasi Saya</h2>
              <p className="text-sm text-muted-foreground font-medium">Kelola peminjaman buku Anda</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-xl transition-colors"
            >
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-6 pb-0 border-b border-border overflow-x-auto">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'waiting', label: 'Menunggu' },
              { id: 'fulfilled', label: 'Disetujui' },
              { id: 'canceled', label: 'Dibatalkan' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'all' | 'waiting' | 'fulfilled' | 'canceled')}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-accent text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader size={40} className="text-primary animate-spin mb-4" />
                <p className="text-muted-foreground font-medium">Memuat reservasi...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <XCircle size={48} className="mx-auto text-primary mb-4" />
                <p className="text-primary font-medium mb-2">Gagal memuat data</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <button
                  onClick={fetchUserReservations}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition"
                >
                  Coba Lagi
                </button>
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground font-medium">Belum ada reservasi</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeTab === 'all' 
                    ? 'Silakan pinjam buku dari katalog' 
                    : `Tidak ada reservasi dengan status ${activeTab}`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReservations.map((res) => (
                  <div key={res.id} className="bg-muted rounded-2xl p-4 hover:bg-muted/80 transition-colors">
                    <div className="flex gap-4">
                      {/* Book Cover */}
                      <div className="w-16 h-20 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                        {res.bibliography?.image ? (
                          <img 
                            src={res.bibliography.image} 
                            alt={res.bibliography.title} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-emerald-900 flex items-center justify-center text-white p-1 text-center">
                            <span className="text-[8px] font-bold">
                              {res.bibliography?.title || 'No Cover'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Book Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-bold text-foreground text-sm mb-1 truncate">
                              {res.bibliography?.title || 'Judul tidak tersedia'}
                            </h3>
                            <p className="text-xs text-muted-foreground mb-2 truncate">
                              {res.bibliography?.author || 'Penulis tidak tersedia'}
                            </p>
                          </div>
                          {getStatusBadge(res.status)}
                        </div>

                        {/* Detail Info */}
                        <div className="space-y-1 mt-2">
                          <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                            <Calendar size={12} />
                            <span>Reservasi: {formatDate(res.createdAt)}</span>
                          </div>
                          
                          {res.bibliography && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="px-2 py-0.5 bg-card rounded-full text-[8px] font-medium text-muted-foreground">
                                {res.bibliography.type === 'physical_book' ? '📚 Buku Fisik' : '📱 E-Book'}
                              </span>
                              {res.bibliography.callNumber && (
                                <span className="px-2 py-0.5 bg-card rounded-full text-[8px] font-mono font-medium text-muted-foreground">
                                  No. Panggil: {res.bibliography.callNumber}
                                </span>
                              )}
                              {res.bibliography.publisher && (
                                <span className="px-2 py-0.5 bg-card rounded-full text-[8px] font-medium text-muted-foreground">
                                  {[res.bibliography.publisher, res.bibliography.publicationYear].filter(Boolean).join(' • ')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <p className="text-[10px] text-muted-foreground">
                            Status: <span className="font-medium text-foreground">
                              {getStatusText(res.status)}
                            </span>
                          </p>
                          
                          {res.status === 'waiting' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancel(res.id);
                              }}
                              className="text-[10px] font-bold text-primary hover:text-primary underline underline-offset-2"
                            >
                              Batalkan
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border">
            <div className="flex items-center justify-between mb-4 text-xs text-muted-foreground">
              <span>Total: {reservations.length} reservasi</span>
              <span>Terakhir diperbarui: {new Date().toLocaleTimeString('id-ID')}</span>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-foreground hover:bg-foreground/90 text-white font-bold rounded-xl transition-all"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationList;