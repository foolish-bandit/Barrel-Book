import React, { useState, useEffect, useMemo } from 'react';
import { List as ListIcon, X, Plus } from 'lucide-react';
import { BOURBONS, Bourbon, FlavorProfile } from './data';
import SubmitBourbonModal from './components/SubmitBourbonModal';
import BarcodeScanner, { BarcodeScanResult } from './components/BarcodeScanner';
import { normalizeBourbonName } from './utils/stringUtils';
import { saveUpcMapping } from './services/upcService';
import { ViewState, Review, User } from './types';
import HomeView from './components/HomeView';
import CatalogView from './components/CatalogView';
import DetailView from './components/DetailView';
import ListsView from './components/ListsView';

// --- Main App Component ---

export default function App() {
  const [view, setView] = useState<ViewState>('home');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // User Data State
  const [wantToTry, setWantToTry] = useState<string[]>([]);
  const [tried, setTried] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [barcodePrefill, setBarcodePrefill] = useState<{ name: string; details: string; upc: string } | null>(null);
  const [customBourbons, setCustomBourbons] = useState<Bourbon[]>([]);

  // Load from localStorage
  useEffect(() => {
    const savedWant = localStorage.getItem('bs_wantToTry');
    const savedTried = localStorage.getItem('bs_tried');
    const savedReviews = localStorage.getItem('bs_reviews');
    const savedUser = localStorage.getItem('bs_user');
    const savedCustom = localStorage.getItem('bs_customBourbons');
    if (savedWant) setWantToTry(JSON.parse(savedWant));
    if (savedTried) setTried(JSON.parse(savedTried));
    if (savedReviews) setReviews(JSON.parse(savedReviews));
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedCustom) setCustomBourbons(JSON.parse(savedCustom));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('bs_wantToTry', JSON.stringify(wantToTry));
    localStorage.setItem('bs_tried', JSON.stringify(tried));
    localStorage.setItem('bs_reviews', JSON.stringify(reviews));
    localStorage.setItem('bs_customBourbons', JSON.stringify(customBourbons));
    if (user) {
      localStorage.setItem('bs_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('bs_user');
    }
  }, [wantToTry, tried, reviews, user, customBourbons]);

  const allBourbons = useMemo(() => {
    return [...BOURBONS, ...customBourbons];
  }, [customBourbons]);

  const handleAddBourbon = (newBourbon: Bourbon) => {
    setCustomBourbons(prev => {
      const normalizedNewName = normalizeBourbonName(newBourbon.name);
      const existingIndex = prev.findIndex(b => normalizeBourbonName(b.name) === normalizedNewName);

      if (existingIndex >= 0) {
        // Merge with existing community submission
        const existing = prev[existingIndex];
        const count = (existing.submissionCount || 1);
        const newCount = count + 1;

        // Average flavor profile
        const newFlavorProfile = { ...existing.flavorProfile };
        (Object.keys(newFlavorProfile) as Array<keyof FlavorProfile>).forEach(key => {
          newFlavorProfile[key] = Math.round(
            ((existing.flavorProfile[key] * count) + newBourbon.flavorProfile[key]) / newCount
          );
        });

        const updatedBourbon: Bourbon = {
          ...existing,
          flavorProfile: newFlavorProfile,
          submissionCount: newCount,
          source: newCount >= 3 ? 'curated' : 'community'
        };

        const newCustom = [...prev];
        newCustom[existingIndex] = updatedBourbon;

        setSelectedId(existing.id);
        return newCustom;
      } else {
        // Add new
        setSelectedId(newBourbon.id);
        return [...prev, newBourbon];
      }
    });
    setShowSubmitModal(false);
    setView('detail');
  };

  // OAuth Message Listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (origin !== window.location.origin) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const newUser = event.data.user;
        setUser(newUser);

        // Check if first time
        const hasSeenRules = localStorage.getItem(`bs_seen_rules_${newUser.id}`);
        if (!hasSeenRules) {
          setShowRulesModal(true);
          localStorage.setItem(`bs_seen_rules_${newUser.id}`, 'true');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSignIn = async () => {
    try {
      const response = await fetch('/api/auth/url');
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();

      const authWindow = window.open(url, 'oauth_popup', 'width=600,height=700');
      if (!authWindow) {
        alert('Please allow popups for this site to sign in.');
      }
    } catch (error) {
      console.error('OAuth error:', error);
      alert('Failed to initiate sign in. Please try again.');
    }
  };

  const handleSignOut = () => {
    setUser(null);
  };

  const toggleWantToTry = (id: string) => {
    if (wantToTry.includes(id)) {
      setWantToTry(prev => prev.filter(x => x !== id));
    } else {
      setWantToTry(prev => [...prev, id]);
      setTried(prev => prev.filter(x => x !== id)); // Remove from tried if adding to want
    }
  };

  const toggleTried = (id: string) => {
    if (tried.includes(id)) {
      setTried(prev => prev.filter(x => x !== id));
    } else {
      setTried(prev => [...prev, id]);
      setWantToTry(prev => prev.filter(x => x !== id)); // Remove from want if adding to tried
    }
  };

  const addReview = (review: Omit<Review, 'id' | 'date' | 'userId' | 'userName' | 'userPicture'>) => {
    const newReview: Review = {
      ...review,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      ...(user && {
        userId: user.id,
        userName: user.name,
        userPicture: user.picture,
      }),
    };
    setReviews(prev => [newReview, ...prev]);
  };

  const handleBarcodeScanResult = (result: BarcodeScanResult) => {
    setShowBarcodeScanner(false);
    if (result.type === 'match') {
      navigateTo('detail', result.bourbonId);
    } else if (result.type === 'prefill') {
      const details = [result.brand, result.description].filter(Boolean).join('. ');
      setBarcodePrefill({ name: result.productName, details, upc: result.upc });
      setShowSubmitModal(true);
    } else if (result.type === 'manual-entry') {
      setBarcodePrefill({ name: '', details: '', upc: result.upc });
      setShowSubmitModal(true);
    }
  };

  const handleAddBourbonWithUpc = (newBourbon: Bourbon, upc?: string) => {
    handleAddBourbon(newBourbon);
    if (upc) {
      saveUpcMapping(upc, newBourbon.id);
    }
  };

  const navigateTo = (newView: ViewState, id?: string) => {
    setView(newView);
    if (id) setSelectedId(id);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-[var(--color-vintage-bg)] text-[var(--color-vintage-text)] font-sans selection:bg-[#C89B3C]/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[var(--color-vintage-bg)]/95 backdrop-blur-md vintage-border-b">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigateTo('home')}
          >
            <div className="w-10 h-10 rounded-full vintage-border flex items-center justify-center group-hover:border-[#C89B3C] transition-colors overflow-hidden p-1">
              <img src="/logo.svg" alt="Barrel Book Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-serif text-2xl font-bold tracking-widest text-[#EAE4D9] uppercase">Barrel Book</span>
          </div>
          <div className="flex gap-6 items-center">
            <button
              onClick={() => navigateTo('catalog')}
              className={`text-xs font-semibold tracking-widest uppercase transition-colors ${view === 'catalog' ? 'text-[#C89B3C]' : 'text-[#EAE4D9]/60 hover:text-[#EAE4D9]'}`}
            >
              Catalog
            </button>
            <button
              onClick={() => navigateTo('lists')}
              className={`text-xs font-semibold tracking-widest uppercase transition-colors flex items-center gap-2 ${view === 'lists' ? 'text-[#C89B3C]' : 'text-[#EAE4D9]/60 hover:text-[#EAE4D9]'}`}
            >
              <ListIcon size={14} /> My Lists
            </button>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="text-xs font-semibold tracking-widest uppercase transition-colors flex items-center gap-2 text-[#EAE4D9]/60 hover:text-[#EAE4D9]"
            >
              <Plus size={14} /> Submit
            </button>
            <div className="w-px h-6 bg-[var(--color-vintage-border)] mx-2"></div>
            {user ? (
              <div className="flex items-center gap-4">
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full vintage-border" referrerPolicy="no-referrer" />
                <button
                  onClick={handleSignOut}
                  className="text-xs font-semibold tracking-widest uppercase text-[#EAE4D9]/60 hover:text-[#EAE4D9] transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="text-xs font-semibold tracking-widest uppercase vintage-border hover:bg-[#C89B3C] hover:text-[#141210] hover:border-[#C89B3C] text-[#C89B3C] px-5 py-2 rounded-full transition-all duration-300"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {view === 'home' && (
          <HomeView
            onNavigate={navigateTo}
            user={user}
            bourbons={allBourbons}
          />
        )}
        {view === 'catalog' && (
          <CatalogView
            onSelect={(id: string) => navigateTo('detail', id)}
            wantToTry={wantToTry}
            tried={tried}
            toggleWantToTry={toggleWantToTry}
            toggleTried={toggleTried}
            bourbons={allBourbons}
            onOpenSubmit={() => setShowSubmitModal(true)}
            onOpenScanner={() => setShowBarcodeScanner(true)}
          />
        )}
        {view === 'detail' && selectedId && (
          <DetailView
            id={selectedId}
            onBack={() => navigateTo('catalog')}
            onSelectSimilar={(id: string) => navigateTo('detail', id)}
            wantToTry={wantToTry}
            tried={tried}
            toggleWantToTry={toggleWantToTry}
            toggleTried={toggleTried}
            reviews={reviews.filter(r => r.bourbonId === selectedId)}
            onAddReview={addReview}
            bourbons={allBourbons}
          />
        )}
        {view === 'lists' && (
          <ListsView
            wantToTry={wantToTry}
            tried={tried}
            onSelect={(id: string) => navigateTo('detail', id)}
            bourbons={allBourbons}
          />
        )}
      </main>

      {/* Submit Bourbon Modal */}
      {showSubmitModal && (
        <SubmitBourbonModal
          onClose={() => { setShowSubmitModal(false); setBarcodePrefill(null); }}
          onSubmit={(bourbon) => {
            handleAddBourbonWithUpc(bourbon, barcodePrefill?.upc);
            setBarcodePrefill(null);
          }}
          onSelectExisting={(id) => {
            if (barcodePrefill?.upc) saveUpcMapping(barcodePrefill.upc, id);
            setShowSubmitModal(false);
            setBarcodePrefill(null);
            navigateTo('detail', id);
          }}
          existingBourbons={allBourbons}
          prefillName={barcodePrefill?.name}
          prefillDetails={barcodePrefill?.details}
          onOpenScanner={() => {
            setShowSubmitModal(false);
            setBarcodePrefill(null);
            setShowBarcodeScanner(true);
          }}
        />
      )}

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onResult={handleBarcodeScanResult}
          onClose={() => setShowBarcodeScanner(false)}
          bourbons={allBourbons}
        />
      )}

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-vintage-bg)]/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#1A1816] vintage-border p-6 md:p-10 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none border-[4px] border-[#141210] m-1"></div>
            <button
              onClick={() => setShowRulesModal(false)}
              className="absolute top-6 right-6 text-[#EAE4D9]/40 hover:text-[#C89B3C] transition-colors z-10"
            >
              <X size={24} />
            </button>

            <div className="text-center mb-10 relative z-10">
              <div className="w-16 h-16 rounded-full vintage-border flex items-center justify-center mx-auto mb-6 overflow-hidden p-1">
                <img src="/logo.svg" alt="Barrel Book Logo" className="w-full h-full object-contain" />
              </div>
              <p className="micro-label mb-2 text-[#C89B3C]">The Golden Rules</p>
              <h2 className="font-serif text-4xl font-normal text-[#EAE4D9] mb-4">Welcome to Barrel Book</h2>
              <div className="w-12 h-px bg-[#C89B3C]/50 mx-auto mb-4"></div>
              <p className="text-[#EAE4D9]/70 font-serif italic text-lg">Before you begin your journey, you must know the three rules of what makes a whiskey a true bourbon.</p>
            </div>

            <div className="space-y-8 relative z-10">
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full vintage-border flex items-center justify-center text-[#C89B3C] font-serif text-xl">1</div>
                <div>
                  <h3 className="font-sans font-semibold text-[#EAE4D9] mb-1 tracking-wide uppercase text-sm">At least 51% corn</h3>
                  <p className="text-sm text-[#EAE4D9]/60 leading-relaxed">The "mash bill" (the mixture of grains used to produce the spirit) must be composed of at least 51% corn.</p>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full vintage-border flex items-center justify-center text-[#C89B3C] font-serif text-xl">2</div>
                <div>
                  <h3 className="font-sans font-semibold text-[#EAE4D9] mb-1 tracking-wide uppercase text-sm">New, charred oak containers</h3>
                  <p className="text-sm text-[#EAE4D9]/60 leading-relaxed">Bourbon must be aged in brand-new containers (typically barrels) made of charred oak. It cannot be aged in used barrels.</p>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full vintage-border flex items-center justify-center text-[#C89B3C] font-serif text-xl">3</div>
                <div>
                  <h3 className="font-sans font-semibold text-[#EAE4D9] mb-1 tracking-wide uppercase text-sm">Produced in the United States</h3>
                  <p className="text-sm text-[#EAE4D9]/60 leading-relaxed">To be legally labeled as bourbon, the spirit must be produced within the U.S. (including the 50 states, D.C., and Puerto Rico).</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full mt-10 bg-transparent vintage-border hover:bg-[#C89B3C] hover:text-[#141210] hover:border-[#C89B3C] text-[#C89B3C] font-sans font-semibold tracking-widest uppercase py-4 transition-all duration-300 relative z-10 text-sm"
            >
              I Understand, Let's Pour
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
