import { Camera, Mail, Phone, MapPin, ShieldCheck, User as UserIcon } from 'lucide-react';
import { type MemberProfile } from '@/services/memberService';
import { getUserAvatar } from '@/lib/avatar';

interface ProfileHeaderProps {
  profile: MemberProfile | null;
  onEditClick: () => void;
}

const ProfileHeader = ({ profile, onEditClick }: ProfileHeaderProps) => {
  if (!profile) return null;

  const user = profile.user;

  return (
    <div className="relative mb-8 pt-4">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/5 to-transparent rounded-[32px] -z-10" />
      
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 px-4">
        {/* Avatar Section */}
        <div className="relative group">
          <div className="w-32 h-32 md:w-40 md:h-40 bg-card rounded-[40px] shadow-2xl shadow-primary/10 flex items-center justify-center border-4 border-white overflow-hidden ring-4 ring-primary/10 transition-all group-hover:scale-105 duration-500">
            <img src={getUserAvatar(user)} alt={user?.name || "Member"} className="w-full h-full object-cover" />
          </div>
          <button 
            className="absolute bottom-2 right-2 bg-foreground text-white p-3 rounded-2xl shadow-lg hover:bg-foreground/90 transition-all active:scale-90"
            onClick={onEditClick}
          >
            <Camera size={18} />
          </button>
        </div>

        {/* Info Section */}
        <div className="flex-1 text-center md:text-left pt-2">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
            <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">{user?.name}</h1>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-green-100 flex items-center gap-1.5 shadow-sm">
                <ShieldCheck size={12} strokeWidth={3} />
                Verified {profile.memberType}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center md:justify-start gap-y-3 gap-x-6 text-muted-foreground font-bold text-xs uppercase tracking-wider">
            <div className="flex items-center gap-2 group cursor-default">
              <div className="w-7 h-7 bg-muted rounded-lg flex items-center justify-center group-hover:bg-accent group-hover:text-primary transition-colors">
                <Mail size={14} />
              </div>
              {user?.email}
            </div>
            {profile.phone && (
              <div className="flex items-center gap-2 group cursor-default">
                <div className="w-7 h-7 bg-muted rounded-lg flex items-center justify-center group-hover:bg-accent group-hover:text-primary transition-colors">
                  <Phone size={14} />
                </div>
                {profile.phone}
              </div>
            )}
            {profile.faculty && (
              <div className="flex items-center gap-2 group cursor-default">
                <div className="w-7 h-7 bg-muted rounded-lg flex items-center justify-center group-hover:bg-accent group-hover:text-primary transition-colors">
                  <MapPin size={14} />
                </div>
                {profile.faculty}
              </div>
            )}
            <div className="flex items-center gap-2 group cursor-default">
              <div className="w-7 h-7 bg-muted rounded-lg flex items-center justify-center group-hover:bg-accent group-hover:text-primary transition-colors">
                <UserIcon size={14} />
              </div>
              ID: {profile.nimNidn || 'NOT SET'}
            </div>
          </div>
          
          <div className="mt-8 flex justify-center md:justify-start gap-4">
            <button 
              onClick={onEditClick}
              className="bg-card border border-border text-foreground px-6 py-2.5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-muted hover:border-border transition-all active:scale-95 shadow-sm"
            >
              Ubah Profil
            </button>
            <button className="bg-accent text-primary px-6 py-2.5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-accent/80 transition-all active:scale-95">
              Ganti Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
