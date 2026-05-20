import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, Circle, Plus, Settings, X, 
  BookOpen, Building, Trash2, ChevronRight,
  GraduationCap, FileText, LayoutDashboard,
  ArrowUp, ArrowDown, Calendar, MessageSquare, AlertCircle, Loader2, Edit2, Globe, LogOut,
  Sun, Moon
} from 'lucide-react';

// --- IMPORTACIONES DE FIREBASE ---
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// --- CONFIGURACIÓN DE FIREBASE SEGURA MEDIANTE VARIABLES DE ENTORNO ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Verificación de configuración en desarrollo
if (!firebaseConfig.apiKey) {
  console.error(
    "Falta la configuración de Firebase en las variables de entorno. " +
    "Por favor, crea un archivo .env local con las credenciales correspondientes."
  );
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- CONFIGURACIÓN INICIAL ESTRICTA ---
const initialMasterProcess = {
  universidad: [
    { id: 'u_1', text: 'Registro en CTI Vitae (filiación principal UC) y perfil activo en CRIS-UC (Art. 6.2)' },
    { id: 'u_2', text: 'Obtención de carta de aprobación del Comité de Ética (OBLIGATORIO antes de recolectar datos, Art. 6.6)' },
    { id: 'u_3', text: 'Registro del proyecto en CRIS-UC adjuntando aprobación ética (CRÍTICO: ANTES de enviar a la revista, Art. 6.5)' },
    { id: 'u_4', text: 'Verificación de filiación en el manuscrito (Ej. Escuela de..., Universidad Continental, Ciudad, Perú) (Art. 6.4)' },
    { id: 'u_5', text: 'Confirmación de publicación e indización en Scopus o Web of Science (Art. 6.8)' },
    { id: 'u_6', text: 'Envío de solicitud de incentivo vía plataforma CRIS (Adjuntar carta de coautores UC si aplica, Art. 6.7)' },
    { id: 'u_7', text: 'Evaluación documentaria por la Dirección de Investigación (Plazo: 15 días, Art. 6.10-6.12)' },
    { id: 'u_8', text: 'Emisión de Recibo por Honorarios (Solo tras indicación de la Dirección de Investigación, Art. 6.12)' },
    { id: 'u_9', text: 'Trámite en Contabilidad/Tesorería y ejecución del pago (Plazo máximo: 30 días hábiles, Art. 6.13)' }
  ],
  publicacion: [
    { id: 'p_1', text: 'Seleccionar revista/conferencia IEEE (Verificar cuartil Q1-Q4 en Scopus/WoS para el bono)' },
    { id: 'p_2', text: 'Adecuación estricta a plantilla IEEE (Doble columna, referencias estilo IEEE)' },
    { id: 'p_3', text: 'Envío del artículo vía IEEE Author Portal / ScholarOne (Submit)' },
    { id: 'p_4', text: 'Revisión por pares (Peer review)' },
    { id: 'p_5', text: 'Levantamiento de observaciones (Major/Minor Revisions y carta de respuesta)' },
    { id: 'p_6', text: 'Aceptación final por el editor (Accepted)' },
    { id: 'p_7', text: 'Firma electrónica de transferencia de copyright (IEEE eCF)' },
    { id: 'p_8', text: 'Envío de versión final (Camera-ready) y archivos fuente' },
    { id: 'p_9', text: 'Publicación oficial en la biblioteca IEEE Xplore' }
  ]
};

// [ADMINISTRADOR DESDE VARIABLES DE ENTORNO]
const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL;

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [firebaseError, setFirebaseError] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false); 
  
  const [masterProcess, setMasterProcess] = useState(initialMasterProcess);
  const [projects, setProjects] = useState([]);
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState(null);
  
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  
  const [editProjectModal, setEditProjectModal] = useState({ isOpen: false, projectId: null, newTitle: '' });
  const [noteModal, setNoteModal] = useState({ isOpen: false, projectId: null, stepId: null, text: '' });
  const [deleteStepModal, setDeleteStepModal] = useState({ isOpen: false, track: null, stepId: null });
  const [deleteProjectModal, setDeleteProjectModal] = useState({ isOpen: false, projectId: null });

  useEffect(() => {
    console.log("Aplicando tema:", theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ---------------------------------------------------------
  // MANEJO DEL BOTÓN ATRÁS DE ANDROID
  // ---------------------------------------------------------
  const resetToDashboard = useCallback(() => {
    setCurrentView('dashboard');
    setSelectedProject(null);
    if (window.history.state?.view !== 'dashboard') {
      window.history.pushState({ view: 'dashboard' }, '');
    }
  }, []);

  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.view !== 'dashboard') {
        if (event.state.view === 'settings') {
          setCurrentView('settings');
          setSelectedProject(null);
        } else if (event.state.view === 'project') {
          setCurrentView('dashboard');
          const project = projects.find(p => p.id === event.state.id);
          setSelectedProject(project || null);
        }
      } else {
        setCurrentView('dashboard');
        setSelectedProject(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    if (!window.history.state) {
      window.history.replaceState({ view: 'dashboard' }, '');
    } else if (window.history.state.view !== 'dashboard' && currentView === 'dashboard' && !selectedProject) {
        window.history.replaceState({ view: 'dashboard' }, '');
    }
    return () => window.removeEventListener('popstate', handlePopState);
  }, [projects, currentView, selectedProject]);

  const navigateToSettings = () => {
    window.history.pushState({ view: 'settings' }, '');
    setCurrentView('settings');
    setSelectedProject(null);
  };

  const navigateToProject = (project) => {
    window.history.pushState({ view: 'project', id: project.id }, '');
    setSelectedProject(project);
    setCurrentView('dashboard');
  };

  const navigateBack = () => {
    window.history.back();
  };

  // ---------------------------------------------------------
  // [ACTUALIZADO] LÓGICA DE FIREBASE HÍBRIDA PWA
  // ---------------------------------------------------------
  
  const handleGoogleLogin = async () => {
    setFirebaseError(null);
    setIsRedirecting(true); 
    
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      // 1. Intentamos forzar el Popup (En Android abre una Chrome Custom Tab que no se rompe en PWA)
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.warn("Popup bloqueado o cancelado, intentando Redirección...", error);
      // 2. Si el sistema bloquea el Popup, usamos la Redirección como Plan B
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        signInWithRedirect(auth, provider).catch(err => {
          setFirebaseError(`Error al redirigir: ${err.message}`);
          setIsRedirecting(false);
        });
      } else {
        setFirebaseError(`Error de conexión: ${error.message}`);
        setIsRedirecting(false);
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    // RESOLVER LA REDIRECCIÓN DE FORMA PROFUNDA
    const resolveRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          const email = result.user.email?.toLowerCase().trim();
          const target = ALLOWED_EMAIL.toLowerCase().trim();
          
          if (email !== target) {
            await signOut(auth);
            setFirebaseError(`Acceso denegado: El correo ${email} no está autorizado.`);
          } else {
            setUser(result.user);
          }
        }
      } catch (error) {
        console.error("Error resolviendo la redirección:", error);
        if (error.code === 'auth/web-storage-unsupported') {
          setFirebaseError("Tu celular bloquea cookies de terceros. Usa la app en Chrome normal o habilita las cookies en tu dispositivo.");
        } else if (error.code !== 'auth/redirect-cancelled-by-user') {
          setFirebaseError(`Fallo crítico al iniciar sesión: ${error.message}`);
        }
      } finally {
        // Una vez revisado el redirect, escuchamos la sesión normal
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (currentUser) {
            const email = currentUser.email?.toLowerCase().trim();
            const target = ALLOWED_EMAIL.toLowerCase().trim();
            
            if (email === target) {
              setUser(currentUser);
              setFirebaseError(null);
            } else {
              await signOut(auth);
              setUser(null);
              setFirebaseError(`Acceso restringido solo para: ${ALLOWED_EMAIL}`);
            }
          } else {
            setUser(null);
          }
          setIsLoadingAuth(false);
          setIsRedirecting(false);
        });
        
        return () => unsubscribe();
      }
    };

    resolveRedirect();
  }, []);

  useEffect(() => {
    if (!user) return; 
    const projectsRef = collection(db, 'public', 'data', 'projects');
    const settingsRef = collection(db, 'public', 'data', 'settings');
    let loadedProjects = false;
    let loadedSettings = false;
    const checkLoading = () => { if (loadedProjects && loadedSettings) setIsLoadingData(false); };

    const unsubProjects = onSnapshot(projectsRef, (snapshot) => {
      const dbProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      dbProjects.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setProjects(dbProjects);
      if (selectedProject) {
        const updatedSelected = dbProjects.find(p => p.id === selectedProject.id);
        if (updatedSelected) setSelectedProject(updatedSelected);
        else setSelectedProject(null);
      }
      loadedProjects = true; checkLoading();
    }, (error) => {
      console.error("Error Firestore Proyectos:", error);
      setFirebaseError(`Error de Base de Datos. ${error.message}`);
      setIsLoadingData(false);
    });

    const unsubSettings = onSnapshot(settingsRef, (snapshot) => {
      const masterDoc = snapshot.docs.find(d => d.id === 'master_process');
      if (masterDoc && masterDoc.exists()) {
        const data = masterDoc.data();
        setMasterProcess({
          universidad: data.universidad || initialMasterProcess.universidad,
          publicacion: data.publicacion || initialMasterProcess.publicacion
        });
      } else {
        setMasterProcess(initialMasterProcess);
      }
      loadedSettings = true; checkLoading();
    }, (error) => {
      console.error("Error Firestore Settings:", error);
      loadedSettings = true; checkLoading();
    });

    return () => { unsubProjects(); unsubSettings(); };
  }, [user, selectedProject?.id]);

  const generateId = () => Math.random().toString(36).substr(2, 9);
  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // --- FUNCIONES CRUD ---
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectTitle.trim() || !user) return;
    const newDocRef = doc(collection(db, 'public', 'data', 'projects'));
    await setDoc(newDocRef, { title: newProjectTitle, createdAt: new Date().toISOString(), completedSteps: {} });
    setNewProjectTitle('');
    setIsNewProjectModalOpen(false);
  };

  const saveProjectTitle = async (e) => {
    e.preventDefault();
    if (!user || !editProjectModal.newTitle.trim()) return;
    await setDoc(doc(db, 'public', 'data', 'projects', editProjectModal.projectId), { title: editProjectModal.newTitle }, { merge: true });
    setEditProjectModal({ isOpen: false, projectId: null, newTitle: '' });
  };

  const confirmDeleteProject = (id) => setDeleteProjectModal({ isOpen: true, projectId: id });
  
  const executeDeleteProject = async () => {
    if (!user) return;
    await deleteDoc(doc(db, 'public', 'data', 'projects', deleteProjectModal.projectId));
    if (selectedProject?.id === deleteProjectModal.projectId) setSelectedProject(null);
    setDeleteProjectModal({ isOpen: false, projectId: null });
  };

  const toggleStep = async (projectId, stepId) => {
    if (!user) return;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const newCompleted = { ...project.completedSteps };
    if (newCompleted[stepId]) delete newCompleted[stepId];
    else newCompleted[stepId] = { completedAt: new Date().toISOString(), note: '' };
    await setDoc(doc(db, 'public', 'data', 'projects', projectId), { ...project, completedSteps: newCompleted });
  };

  const saveNote = async () => {
    if (!user) return;
    const project = projects.find(p => p.id === noteModal.projectId);
    if (!project) return;
    const newCompleted = { ...project.completedSteps };
    if (newCompleted[noteModal.stepId]) newCompleted[noteModal.stepId] = { ...newCompleted[noteModal.stepId], note: noteModal.text };
    await setDoc(doc(db, 'public', 'data', 'projects', project.id), { ...project, completedSteps: newCompleted });
    setNoteModal({ isOpen: false, projectId: null, stepId: null, text: '' });
  };

  const saveMasterProcessSettings = async (newProcessData) => {
    if (!user) return;
    await setDoc(doc(db, 'public', 'data', 'settings', 'master_process'), newProcessData);
  };

  const addMasterStep = (track, text) => {
    if (!text.trim()) return;
    saveMasterProcessSettings({ ...masterProcess, [track]: [...masterProcess[track], { id: `${track.charAt(0)}_${generateId()}`, text }] });
  };

  const moveMasterStep = (track, index, direction) => {
    const newTrack = [...masterProcess[track]];
    if (direction === 'up' && index > 0) [newTrack[index - 1], newTrack[index]] = [newTrack[index], newTrack[index - 1]];
    else if (direction === 'down' && index < newTrack.length - 1) [newTrack[index + 1], newTrack[index]] = [newTrack[index], newTrack[index + 1]];
    saveMasterProcessSettings({ ...masterProcess, [track]: newTrack });
  };

  const confirmDeleteMasterStep = (track, stepId) => setDeleteStepModal({ isOpen: true, track, stepId });
  const executeDeleteMasterStep = () => {
    saveMasterProcessSettings({ ...masterProcess, [deleteStepModal.track]: masterProcess[deleteStepModal.track].filter(s => s.id !== deleteStepModal.stepId) });
    setDeleteStepModal({ isOpen: false, track: null, stepId: null });
  };

  const calculateProgress = (project, track) => {
    const trackSteps = masterProcess[track];
    if (trackSteps.length === 0) return 0;
    return Math.round((trackSteps.filter(step => project.completedSteps[step.id]).length / trackSteps.length) * 100);
  };

  // --- VISTAS ---

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center transition-colors duration-200 relative">
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 transition-colors"
            title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>
        <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Verificando seguridad...</p>
      </div>
    );
  }

  // PANTALLA DE LOGIN
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 transition-colors duration-200 relative">
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 transition-colors"
            title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <LayoutDashboard className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">PubliTracker UC</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Inicia sesión con tu cuenta de administrador para acceder a tus proyectos.</p>

          {firebaseError && (
            <div className="mb-6 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-100 dark:border-red-900/40 flex items-start text-left">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <p>{firebaseError}</p>
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={isRedirecting}
            className="w-full flex items-center justify-center bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-4 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-650 transition shadow-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isRedirecting ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin text-indigo-600 dark:text-indigo-400" />
                Conectando con Google...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Acceder con Google
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center transition-colors duration-200 relative">
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 transition-colors"
            title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>
        <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Cargando tus proyectos...</p>
      </div>
    );
  }

  const ProgressBar = ({ progress, colorClass, label, icon: Icon }) => (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1 text-sm">
        <div className="flex items-center text-slate-600 dark:text-slate-300 font-medium"><Icon className="w-4 h-4 mr-1.5" /> {label}</div>
        <span className="font-bold text-slate-800 dark:text-slate-200">{progress}%</span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-750 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );

  const DashboardView = () => (
    <div className="p-4 md:p-8 max-w-full w-full px-4 md:px-8 lg:px-12 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
            <BookOpen className="w-8 h-8 mr-3 text-indigo-600 dark:text-indigo-400" />
            Trazabilidad de Publicaciones
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gestión administrativa y editorial.</p>
        </div>
        <div className="flex w-full md:w-auto gap-3">
          <button onClick={navigateToSettings} className="flex-1 md:flex-none flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-650 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm">
            <Settings className="w-5 h-5 mr-2" /> Procesos
          </button>
          <button onClick={() => setIsNewProjectModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition shadow-sm">
            <Plus className="w-5 h-5 mr-2" /> Nuevo
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 dark:text-slate-350">Aún no hay proyectos</h3>
          <button onClick={() => setIsNewProjectModalOpen(true)} className="mt-6 text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800 dark:hover:text-indigo-300">+ Crear el primer proyecto</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {projects.map(project => (
            <div key={project.id} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500 transition-all cursor-pointer flex flex-col h-full" onClick={() => navigateToProject(project)}>
              <div className="flex justify-between items-start mb-4 gap-2">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 leading-tight flex-grow pr-2 line-clamp-2" title={project.title}>
                  {project.title}
                </h3>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); setEditProjectModal({ isOpen: true, projectId: project.id, newTitle: project.title }); }} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 p-2 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={(e) => { e.stopPropagation(); confirmDeleteProject(project.id); }} className="text-slate-400 hover:text-red-650 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/20 p-2 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex-grow">
                <ProgressBar progress={calculateProgress(project, 'universidad')} colorClass="bg-blue-500 dark:bg-blue-600" label="Trámite UC" icon={Building} />
                <ProgressBar progress={calculateProgress(project, 'publicacion')} colorClass="bg-emerald-500 dark:bg-emerald-600" label="Proceso IEEE" icon={GraduationCap} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const ProjectDetailView = () => {
    const project = selectedProject;
    if(!project) return null;

    const ChecklistSection = ({ title, track, icon: Icon, colorClass, textColor, progress }) => (
      <div className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full transition-colors duration-200">
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-xl font-bold flex items-center ${textColor}`}><Icon className="w-6 h-6 mr-2" /> {title}</h2>
          <span className={`bg-opacity-10 px-3 py-1 rounded-full text-sm font-bold ${textColor} bg-current`}>{progress}%</span>
        </div>
        <div className="space-y-3 flex-grow">
          {masterProcess[track].map((step, index) => {
            const stepData = project.completedSteps?.[step.id];
            const isCompleted = !!stepData;
            return (
              <div key={step.id} className={`flex flex-col p-3 rounded-lg transition border ${isCompleted ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/60' : 'hover:bg-slate-50 dark:hover:bg-slate-900/40 border-transparent'}`}>
                <div className="flex items-start">
                  <div className="mt-0.5 flex-shrink-0 cursor-pointer p-1" onClick={() => toggleStep(project.id, step.id)}>
                    {isCompleted ? <CheckCircle2 className={`w-5 h-5 ${textColor}`} /> : <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 hover:text-indigo-400 dark:hover:text-indigo-500 transition" />}
                  </div>
                  <div className="ml-2 flex-grow cursor-pointer" onClick={() => toggleStep(project.id, step.id)}>
                    <p className={`text-sm md:text-base transition-all ${isCompleted ? 'text-slate-500 dark:text-slate-450 line-through' : 'text-slate-700 dark:text-slate-200'}`}><span className="font-semibold mr-2 text-slate-400 dark:text-slate-500">{index + 1}.</span> {step.text}</p>
                  </div>
                </div>
                {isCompleted && (
                  <div className="ml-9 mt-2 flex flex-col items-start gap-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 font-medium bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 shadow-sm"><Calendar className="w-3 h-3 mr-1" /> Completado el {formatDate(stepData.completedAt)}</div>
                    {stepData.note && <div className="text-sm text-slate-600 dark:text-slate-300 bg-yellow-50/55 dark:bg-yellow-950/20 border border-yellow-200/50 dark:border-yellow-900/30 px-3 py-2 rounded-md w-full relative"><MessageSquare className="w-4 h-4 text-yellow-600 dark:text-yellow-400 absolute top-2 right-2 opacity-30" /><p className="pr-6">{stepData.note}</p></div>}
                    <button onClick={() => setNoteModal({ isOpen: true, projectId: project.id, stepId: step.id, text: stepData.note || '' })} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center mt-1"><MessageSquare className="w-3 h-3 mr-1" /> {stepData.note ? 'Editar nota' : '+ Añadir nota'}</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );

    return (
      <div className="p-4 md:p-8 max-w-full w-full px-4 md:px-8 lg:px-12 animate-in fade-in zoom-in-95 duration-200">
        <button onClick={navigateBack} className="mb-6 flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition font-medium"><ChevronRight className="w-5 h-5 mr-1 rotate-180" /> Volver al Tablero</button>
        <div className="mb-8 bg-white dark:bg-slate-800 p-5 md:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-grow">
            <div className="flex items-start md:items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 leading-tight">{project.title}</h1>
              <button onClick={() => setEditProjectModal({ isOpen: true, projectId: project.id, newTitle: project.title })} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 p-2 rounded-lg transition-colors flex-shrink-0 mt-1 md:mt-0"><Edit2 className="w-5 h-5" /></button>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Proyecto creado el {formatDate(project.createdAt)}</p>
          </div>
          <button onClick={() => confirmDeleteProject(project.id)} className="flex items-center justify-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/40 px-4 py-2 rounded-lg font-medium transition-colors border border-red-100 dark:border-red-900/30 md:w-auto w-full flex-shrink-0"><Trash2 className="w-4 h-4 mr-2" /> Eliminar Proyecto</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-start">
          <ChecklistSection title="Incentivo Universidad Continental" track="universidad" icon={Building} textColor="text-blue-600 dark:text-blue-400" progress={calculateProgress(project, 'universidad')} />
          <ChecklistSection title="Proceso Editorial IEEE" track="publicacion" icon={GraduationCap} textColor="text-emerald-600 dark:text-emerald-400" progress={calculateProgress(project, 'publicacion')} />
        </div>
      </div>
    );
  };

  const SettingsView = () => {
    const [newStepText, setNewStepText] = useState({ universidad: '', publicacion: '' });
    const handleAddStep = (track) => { addMasterStep(track, newStepText[track]); setNewStepText({ ...newStepText, [track]: '' }); };

    const ProcessEditor = ({ title, track, icon: Icon, colorClass }) => (
      <div className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full transition-colors duration-200">
        <h2 className="text-xl font-bold flex items-center text-slate-800 dark:text-slate-100 mb-2"><Icon className={`w-6 h-6 mr-2 ${colorClass}`} /> {title}</h2>
        <p className="text-sm text-slate-550 dark:text-slate-400 mb-6">Esta plantilla aplica a todos los proyectos y se actualizará para todos los que usen la app.</p>
        <div className="space-y-2 mb-6 flex-grow">
          {masterProcess[track].map((step, index) => (
            <div key={step.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 transition-all">
              <span className="text-sm md:text-base text-slate-700 dark:text-slate-200 pr-2"><span className="font-bold mr-2 text-slate-400 dark:text-slate-550">{index + 1}.</span>{step.text}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => moveMasterStep(track, index, 'up')} disabled={index === 0} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-20 p-1"><ArrowUp className="w-4 h-4" /></button>
                <button onClick={() => moveMasterStep(track, index, 'down')} disabled={index === masterProcess[track].length - 1} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-20 p-1"><ArrowDown className="w-4 h-4" /></button>
                <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1"></div>
                <button onClick={() => confirmDeleteMasterStep(track, step.id)} className="text-slate-400 hover:text-red-500 p-1"><X className="w-5 h-5" /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-auto">
          <input type="text" placeholder="Añadir nuevo paso..." className="flex-1 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={newStepText[track]} onChange={(e) => setNewStepText({...newStepText, [track]: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && handleAddStep(track)} />
          <button onClick={() => handleAddStep(track)} disabled={!newStepText[track].trim()} className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-lg font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition disabled:opacity-50">Añadir</button>
        </div>
      </div>
    );

    return (
      <div className="p-4 md:p-8 max-w-full w-full px-4 md:px-8 lg:px-12 animate-in fade-in zoom-in-95 duration-200">
        <button onClick={navigateBack} className="mb-6 flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition font-medium"><ChevronRight className="w-5 h-5 mr-1 rotate-180" /> Volver al Tablero</button>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-8">Estructura Global de Procesos</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-start">
          <ProcessEditor title="Trámite Universidad Continental" track="universidad" icon={Building} colorClass="text-blue-500 dark:text-blue-400" />
          <ProcessEditor title="Proceso de Publicación IEEE" track="publicacion" icon={GraduationCap} colorClass="text-emerald-500 dark:text-emerald-400" />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 selection:bg-indigo-100 dark:selection:bg-indigo-900 transition-colors duration-200 pb-20">
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm transition-colors duration-200">
        <div className="w-full px-4 md:px-8 lg:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-slate-800 dark:text-slate-100 cursor-pointer" onClick={() => (currentView !== 'dashboard' || selectedProject) ? navigateBack() : null}>
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg"><LayoutDashboard className="w-5 h-5" /></div>
            <span className="hidden sm:inline">PubliTracker <span className="text-indigo-600 dark:text-indigo-400">UC</span></span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-650 rounded-lg transition-colors mr-1"
              title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-900/40">
              <Globe className="w-3.5 h-3.5" /> Administrador
            </div>
            
            <button onClick={handleLogout} className="ml-2 p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors" title="Cerrar sesión">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main>{currentView === 'settings' ? <SettingsView /> : selectedProject ? <ProjectDetailView /> : <DashboardView />}</main>

      {/* MODALES */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-5">Nuevo Proyecto IEEE</h3>
            <form onSubmit={handleCreateProject}>
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Título de la Publicación</label>
                <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24" placeholder="Ej: Analysis of machine learning algorithms..." value={newProjectTitle} onChange={(e) => setNewProjectTitle(e.target.value)} autoFocus />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsNewProjectModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Cancelar</button>
                <button type="submit" disabled={!newProjectTitle.trim()} className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition disabled:opacity-50">Crear Proyecto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editProjectModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center"><Edit2 className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400"/> Renombrar Proyecto</h3>
            <form onSubmit={saveProjectTitle}>
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nuevo Título</label>
                <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24" value={editProjectModal.newTitle} onChange={(e) => setEditProjectModal({...editProjectModal, newTitle: e.target.value})} autoFocus />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setEditProjectModal({ isOpen: false, projectId: null, newTitle: '' })} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Cancelar</button>
                <button type="submit" disabled={!editProjectModal.newTitle.trim()} className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition disabled:opacity-50">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteProjectModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" /></div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 text-center mb-2">¿Eliminar proyecto?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">Se borrará para todos de forma irreversible.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteProjectModal({ isOpen: false, projectId: null })} className="flex-1 px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Cancelar</button>
              <button onClick={executeDeleteProject} className="flex-1 px-4 py-2 bg-red-600 dark:bg-red-500 text-white font-medium rounded-lg hover:bg-red-750 dark:hover:bg-red-650 transition">Eliminar</button>
            </div>
          </div>
        </div>
      )}
      
      {noteModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4"><MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /><h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Añadir Nota al Paso</h3></div>
            <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-32 mb-5" placeholder="Ej: Link del Paper en ScholarOne..." value={noteModal.text} onChange={(e) => setNoteModal({...noteModal, text: e.target.value})} autoFocus />
            <div className="flex justify-end gap-3">
              <button onClick={() => setNoteModal({...noteModal, isOpen: false})} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Cancelar</button>
              <button onClick={saveNote} className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {deleteStepModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" /></div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 text-center mb-2">¿Eliminar este paso de la plantilla?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">Al ser un espacio compartido, afectará a la plantilla de todos.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteStepModal({ isOpen: false, track: null, stepId: null })} className="flex-1 px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Cancelar</button>
              <button onClick={executeDeleteMasterStep} className="flex-1 px-4 py-2 bg-red-600 dark:bg-red-500 text-white font-medium rounded-lg hover:bg-red-750 dark:hover:bg-red-650 transition">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}