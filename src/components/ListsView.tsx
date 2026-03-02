import { Heart, CheckCircle } from 'lucide-react';
import { Bourbon } from '../data';
import { ViewState } from '../types';
import ListCard from './ListCard';

interface ListsViewProps {
  wantToTry: string[];
  tried: string[];
  onSelect: (id: string) => void;
  onNavigate: (view: ViewState) => void;
  bourbons: Bourbon[];
}

export default function ListsView({ wantToTry, tried, onSelect, onNavigate, bourbons }: ListsViewProps) {
  const wantBourbons = wantToTry.map((id) => bourbons.find((b) => b.id === id)).filter(Boolean) as Bourbon[];
  const triedBourbons = tried.map((id) => bourbons.find((b) => b.id === id)).filter(Boolean) as Bourbon[];

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="text-center space-y-4 py-8">
        <h1 className="font-serif text-4xl md:text-5xl font-normal text-[#EAE4D9]">My Barrel Book</h1>
        <p className="text-[#EAE4D9]/60 font-serif italic max-w-2xl mx-auto text-lg">Track your whiskey journey.</p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-3 vintage-border-b pb-4">
          <Heart className="text-[#C89B3C]" size={24} />
          <h2 className="font-serif text-2xl text-[#EAE4D9]">Want to Try ({wantBourbons.length})</h2>
        </div>

        {wantBourbons.length === 0 ? (
          <div className="bg-[#1A1816] vintage-border border-dashed p-12 text-center text-[#EAE4D9]/40 font-serif italic">
            <p className="mb-6">Your wishlist is empty. Explore the catalog to find new pours.</p>
            <button
              onClick={() => onNavigate('catalog')}
              className="bg-transparent vintage-border hover:bg-[#C89B3C] hover:text-[#141210] hover:border-[#C89B3C] text-[#C89B3C] font-sans font-semibold tracking-widest uppercase px-6 py-2 transition-colors"
            >
              Browse Catalog
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wantBourbons.map((b) => (
              <ListCard key={b.id} bourbon={b} onClick={() => onSelect(b.id)} />
            ))}
          </div>
        )}
      </div>

      <div className="w-full h-px bg-gradient-to-r from-transparent via-[#C89B3C]/30 to-transparent" />

      <div className="space-y-6">
        <div className="flex items-center gap-3 vintage-border-b pb-4">
          <CheckCircle className="text-[#C89B3C]" size={24} />
          <h2 className="font-serif text-2xl text-[#EAE4D9]">Tried ({triedBourbons.length})</h2>
        </div>

        {triedBourbons.length === 0 ? (
          <div className="bg-[#1A1816] vintage-border border-dashed p-12 text-center text-[#EAE4D9]/40 font-serif italic">
            <p className="mb-6">You haven't marked any bourbons as tried yet.</p>
            <button
              onClick={() => onNavigate('catalog')}
              className="bg-transparent vintage-border hover:bg-[#C89B3C] hover:text-[#141210] hover:border-[#C89B3C] text-[#C89B3C] font-sans font-semibold tracking-widest uppercase px-6 py-2 transition-colors"
            >
              Browse Catalog
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {triedBourbons.map((b) => (
              <ListCard key={b.id} bourbon={b} onClick={() => onSelect(b.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
