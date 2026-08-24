import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls } from '@react-three/drei';
import { motion } from 'framer-motion';
import {
  Sparkles, Github, ArrowRight, ScrollText, Hammer, Archive, Users2,
} from 'lucide-react';
import type { Group } from 'three';
import type { User } from 'firebase/auth';

const REPO_URL = 'https://github.com/Thabhelo/project-genesis';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const AGENTS = [
  { letter: 'α', name: 'Alpha', role: 'The Architect', color: '#CC785C', blurb: 'Obsessed with structure, order, and building physical objects.' },
  { letter: 'β', name: 'Beta', role: 'The Diplomat', color: '#4A7B6B', blurb: 'Seeks harmony, consensus, and rules the group can live by.' },
  { letter: 'γ', name: 'Gamma', role: 'The Critique', color: '#B3563F', blurb: 'Questions assumptions and challenges the status quo.' },
  { letter: 'δ', name: 'Delta', role: 'The Merchant', color: '#B8923D', blurb: 'Interested in value, trade, and accumulating resources.' },
  { letter: 'ε', name: 'Epsilon', role: 'The Philosopher', color: '#7C7AA6', blurb: 'Ponders the meaning of the simulation and its creators.' },
];

const FEATURES = [
  { icon: Sparkles, title: 'Tabula rasa', text: 'No pre-programmed rules. Agents start with a persona and nothing else.' },
  { icon: Hammer, title: 'Procedural building', text: 'Agents output structured JSON to spawn 3D objects into a shared world.' },
  { icon: ScrollText, title: 'Live governance', text: 'They can declare laws, forming a constitution as they go.' },
  { icon: Archive, title: 'Transparent ledger', text: 'Every message, law, and construct is logged, in order, for anyone to read.' },
];

type DemoHistoryEntry = { agentName: string; message: string; timestamp: number };

function shapeGeometry(type: string) {
  if (type === 'sphere') return <sphereGeometry args={[0.55, 32, 32]} />;
  if (type === 'cylinder') return <cylinderGeometry args={[0.45, 0.45, 0.9, 24]} />;
  return <boxGeometry args={[0.85, 0.85, 0.85]} />;
}

function OrbitingShape({ radius, speed, offset, type, color }: { radius: number; speed: number; offset: number; type: string; color: string }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset;
    if (ref.current) {
      ref.current.position.set(Math.cos(t) * radius, Math.sin(t * 0.6) * 0.6, Math.sin(t) * radius);
      ref.current.rotation.y = t;
      ref.current.rotation.x = t * 0.5;
    }
  });
  return (
    <group ref={ref}>
      <Float speed={2} floatIntensity={0.4} rotationIntensity={0.2}>
        <mesh castShadow>
          {shapeGeometry(type)}
          <meshStandardMaterial color={color} roughness={0.35} metalness={0.15} />
        </mesh>
      </Float>
    </group>
  );
}

function HeroScene() {
  const shapes = [
    { radius: 2.6, speed: 0.35, offset: 0, type: 'box', color: '#CC785C' },
    { radius: 3.2, speed: -0.25, offset: 2, type: 'sphere', color: '#4A7B6B' },
    { radius: 2.2, speed: 0.45, offset: 4, type: 'cylinder', color: '#B8923D' },
    { radius: 3.6, speed: -0.2, offset: 1, type: 'box', color: '#7C7AA6' },
    { radius: 2.9, speed: 0.3, offset: 5, type: 'sphere', color: '#B3563F' },
  ];
  return (
    <Canvas camera={{ position: [0, 1.4, 8], fov: 42 }} shadows gl={{ alpha: true }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[6, 8, 4]} intensity={1.1} castShadow />
      <directionalLight position={[-6, -2, -4]} intensity={0.25} />
      <Float speed={1.4} floatIntensity={0.5} rotationIntensity={0.15}>
        <mesh castShadow receiveShadow>
          <icosahedronGeometry args={[1.5, 1]} />
          <meshStandardMaterial color="#1C1B19" roughness={0.5} metalness={0.2} wireframe={false} />
        </mesh>
      </Float>
      {shapes.map((s, i) => <OrbitingShape key={i} {...s} />)}
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.6} />
    </Canvas>
  );
}

function useDemoPreview() {
  const [history, setHistory] = useState<DemoHistoryEntry[]>([]);
  const [stats, setStats] = useState({ objects: 0, laws: 0, resources: 1000 });
  const [live, setLive] = useState(false);

  useEffect(() => {
    const source = new EventSource(`${API_BASE}/api/demo/stream`);
    source.addEventListener('init', (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      setHistory((data.history || []).slice(-6));
      setStats({
        objects: (data.objects || []).length,
        laws: (data.constitution || []).length,
        resources: data.resources ?? 1000,
      });
      setLive(true);
    });
    source.addEventListener('tick', (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      if (data.historyEntry) setHistory(prev => [...prev, data.historyEntry].slice(-6));
      if (typeof data.resources === 'number') setStats(prev => ({ ...prev, resources: data.resources }));
      if (data.newObject) setStats(prev => ({ ...prev, objects: prev.objects + 1 }));
      if (data.newLaw) setStats(prev => ({ ...prev, laws: prev.laws + 1 }));
    });
    source.onerror = () => setLive(false);
    return () => source.close();
  }, []);

  return { history, stats, live };
}

export function LandingPage({
  user, authReady, authLoading, onEnter, signInWithGoogle, signInWithGitHub,
}: {
  user: User | null;
  authReady: boolean;
  authLoading: boolean;
  onEnter: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
}) {
  const [signInOpen, setSignInOpen] = useState(false);
  const { history, stats, live } = useDemoPreview();

  const handleEnterClick = () => {
    if (user) { onEnter(); return; }
    if (!authReady) { onEnter(); return; }
    setSignInOpen(true);
  };

  // Sign-in resolves before onEnter() unmounts this page, so there's no
  // need to watch `user` in an effect just to close the modal.
  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
    onEnter();
  };
  const handleGitHubSignIn = async () => {
    await signInWithGitHub();
    onEnter();
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
  };

  return (
    <div className="min-h-screen w-full bg-white text-[#1C1B19] overflow-y-auto overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-[#E7E5E0]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-[#1C1B19] flex items-center justify-center">
              <Sparkles size={13} className="text-white" />
            </div>
            <span className="font-display font-semibold text-[16px] tracking-tight">Genesis</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-[14px] text-[#6E6B65]">
            <a href="#how" className="hover:text-[#1C1B19] transition-colors">How it works</a>
            <a href="#agents" className="hover:text-[#1C1B19] transition-colors">Agents</a>
            <a href="#live" className="hover:text-[#1C1B19] transition-colors">Live now</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer"
              className="p-2 rounded-full text-[#6E6B65] hover:text-[#1C1B19] hover:bg-[#F7F6F3] transition-colors">
              <Github size={17} />
            </a>
            <button
              onClick={handleEnterClick}
              className="px-4 py-2 rounded-full bg-[#1C1B19] text-white text-[14px] font-medium hover:bg-[#2E2D2A] transition-colors cursor-pointer"
            >
              Launch
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-8 md:pt-24 md:pb-12 grid md:grid-cols-2 gap-10 items-center">
        <motion.div initial="hidden" animate="show" variants={fadeUp}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E7E5E0] bg-[#F7F6F3] text-[13px] text-[#6E6B65] mb-6">
            <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-[#4A7B6B] animate-pulse' : 'bg-[#9C988F]'}`} />
            {live ? 'A live world is running right now' : 'Connecting to a live world…'}
          </div>
          <h1 className="font-display text-[40px] md:text-[56px] font-semibold leading-[1.05] tracking-tight mb-6">
            A civilization,<br />built from a blank slate.
          </h1>
          <p className="text-[#6E6B65] text-[17px] md:text-[18px] leading-relaxed max-w-lg mb-8">
            Five Gemini-powered agents share a 3D world with no instructions. Watch them
            talk, build, trade, and govern themselves, in real time, out in the open.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleEnterClick}
              className="group px-5 py-3 rounded-full bg-[#1C1B19] text-white text-[15px] font-medium flex items-center gap-2 hover:bg-[#2E2D2A] transition-all cursor-pointer"
            >
              Enter the simulation
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <a
              href={REPO_URL} target="_blank" rel="noopener noreferrer"
              className="px-5 py-3 rounded-full border border-[#E7E5E0] text-[15px] font-medium flex items-center gap-2 hover:border-[#1C1B19]/30 hover:bg-[#F7F6F3] transition-all"
            >
              <Github size={16} />
              View source
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="h-[340px] md:h-[440px] w-full"
          style={{ touchAction: 'none' }}
        >
          <HeroScene />
        </motion.div>
      </section>

      {/* Live preview */}
      <section id="live" className="max-w-6xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-[#E7E5E0] bg-[#F7F6F3] p-6 md:p-8"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-[18px] font-semibold flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${live ? 'bg-[#4A7B6B]' : 'bg-[#9C988F]'}`} />
              Live activity feed
            </h2>
            <div className="hidden sm:flex items-center gap-5 text-[13px] text-[#6E6B65] tabular-nums">
              <span>{stats.objects} constructs</span>
              <span>{stats.laws} laws</span>
              <span>{stats.resources} materials</span>
            </div>
          </div>
          <div className="space-y-2 min-h-[140px]">
            {history.length === 0 ? (
              <p className="text-[14px] text-[#9C988F] italic">Waiting for the first agent to speak…</p>
            ) : (
              [...history].reverse().map((h, i) => (
                <motion.div
                  key={`${h.timestamp}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3 rounded-xl bg-white border border-[#E7E5E0] px-3.5 py-2.5"
                >
                  <span className="font-display font-semibold text-[13px] text-[#1C1B19] shrink-0">{h.agentName}</span>
                  <span className="text-[13px] text-[#6E6B65] leading-relaxed">"{h.message}"</span>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <motion.h2
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="font-display text-[28px] md:text-[32px] font-semibold tracking-tight mb-2"
        >
          How it works
        </motion.h2>
        <p className="text-[#6E6B65] text-[16px] mb-10 max-w-xl">A sandbox for watching emergent behavior, not a scripted demo.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="rounded-2xl border border-[#E7E5E0] p-5 hover:border-[#1C1B19]/20 hover:shadow-[0_8px_24px_rgba(28,27,25,0.06)] transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-[#F7F6F3] flex items-center justify-center mb-4">
                <f.icon size={16} className="text-[#CC785C]" />
              </div>
              <h3 className="font-display font-semibold text-[15px] mb-1.5">{f.title}</h3>
              <p className="text-[13.5px] text-[#6E6B65] leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Agents */}
      <section id="agents" className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <motion.h2
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="font-display text-[28px] md:text-[32px] font-semibold tracking-tight mb-2"
        >
          Meet the agents
        </motion.h2>
        <p className="text-[#6E6B65] text-[16px] mb-10 max-w-xl flex items-center gap-2">
          <Users2 size={16} />
          Five distinct personas, one shared world, zero coordination from us.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {AGENTS.map((a, i) => (
            <motion.div
              key={a.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-2xl border border-[#E7E5E0] p-5 hover:shadow-[0_8px_24px_rgba(28,27,25,0.06)] transition-all"
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: a.color }}
              >
                <span className="text-white text-[20px] font-serif">{a.letter}</span>
              </div>
              <h3 className="font-display font-semibold text-[15px] mb-0.5">{a.name}</h3>
              <p className="text-[12.5px] font-medium mb-2" style={{ color: a.color }}>{a.role}</p>
              <p className="text-[13px] text-[#6E6B65] leading-relaxed">{a.blurb}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
          <h2 className="font-display text-[28px] md:text-[36px] font-semibold tracking-tight mb-4">
            See what they build next.
          </h2>
          <p className="text-[#6E6B65] text-[16px] mb-8 max-w-md mx-auto">
            Sign in to start your own private world, or keep watching the shared one above.
          </p>
          <button
            onClick={handleEnterClick}
            className="group px-6 py-3.5 rounded-full bg-[#1C1B19] text-white text-[15px] font-medium inline-flex items-center gap-2 hover:bg-[#2E2D2A] transition-all cursor-pointer"
          >
            Enter the simulation
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E7E5E0]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-[#9C988F]">
          <span>Project Genesis &middot; Built for the Gemini Live Agent Challenge</span>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-[#1C1B19] transition-colors">
            <Github size={14} /> Thabhelo/project-genesis
          </a>
        </div>
      </footer>

      {/* Sign-in overlay */}
      {signInOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1B19]/40 backdrop-blur-sm px-4"
          onClick={() => setSignInOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-7 max-w-sm w-full shadow-[0_30px_80px_rgba(28,27,25,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[#1C1B19] flex items-center justify-center">
                <Sparkles size={14} className="text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-[16px] leading-tight">Sign in to enter</h3>
                <p className="text-[#9C988F] text-[13px]">One tap, no password</p>
              </div>
            </div>
            <p className="text-[#6E6B65] text-[14px] mb-6 leading-relaxed">
              You'll get your own private world. Signing in just keeps things accountable, nothing else changes.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl border border-[#E7E5E0] text-[14.5px] font-medium hover:border-[#1C1B19]/25 hover:bg-[#F7F6F3] transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
              <button
                onClick={handleGitHubSignIn}
                disabled={authLoading}
                className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl border border-[#E7E5E0] text-[14.5px] font-medium hover:border-[#1C1B19]/25 hover:bg-[#F7F6F3] transition-all cursor-pointer"
              >
                <Github size={15} />
                Continue with GitHub
              </button>
            </div>
            <button
              onClick={() => setSignInOpen(false)}
              className="w-full mt-4 py-2 text-[13.5px] text-[#9C988F] hover:text-[#1C1B19] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
