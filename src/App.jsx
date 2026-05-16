import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Circle, Plus, Settings, X, 
  BookOpen, Building, Trash2, ChevronRight,
  GraduationCap, FileText, LayoutDashboard,
  ArrowUp, ArrowDown, Calendar, MessageSquare, AlertCircle, Loader2, Edit2, Globe
} from 'lucide-react';

// --- IMPORTACIONES DE FIREBASE ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// --- INICIALIZACIÓN DE FIREBASE (¡REEMPLAZA ESTO CON TUS DATOS!) ---
const firebaseConfig = {
  apiKey: "AIzaSyDDG8l2TCegyE_bsNOpsi8S6cDc2LQyKqs",
  authDomain: "gestor-uc.firebaseapp.com",
  projectId: "gestor-uc",
  storageBucket: "gestor-uc.firebasestorage.app",
  messagingSenderId: "30485388346",
  appId: "1:30485388346:web:2bd5c8385b188e22ce2903",
  measurementId: "G-Q9DT3P1FD3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Usamos el ID de tu proyecto de Firebase como identificador único
const appId = firebaseConfig.projectId || "gestor-uc-default";

// --- CONFIGURACIÓN INICIAL ESTRICTA BASADA EN RESOLUCIÓN 4878-2025-R/UC ---
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

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [masterProcess, setMasterProcess] = useState(initialMasterProcess);
  const [projects, setProjects] = useState([]);
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState(null);
  
  // Modales
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  
  const [editProjectModal, setEditProjectModal] = useState({ isOpen: false, projectId: null, newTitle: '' });
  const [noteModal, setNoteModal] = useState({ isOpen: false, projectId: null, stepId: null, text: '' });
  const [deleteStepModal, setDeleteStepModal] = useState({ isOpen: false, track: null, stepId: null });
  const [deleteProjectModal, setDeleteProjectModal] = useState({ isOpen: false, projectId: null });

  // 1. Autenticación (Espacio público, pero Firebase requiere un ID anónimo)
  useEffect(() => {
    signInAnonymously(auth).catch(error => console.error("Error Auth:", error));
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Suscripción a Datos PÚBLICOS/COMPARTIDOS
  useEffect(() => {
    if (!user) return;

    // Ruta global pública en Firestore
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
    }, (error) => console.error(error));

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
    }, (error) => console.error(error));

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

  if (isLoadingAuth || isLoadingData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Conectando al espacio de trabajo compartido...</p>
      </div>
    );
  }

  const ProgressBar = ({ progress, colorClass, label, icon: Icon }) => (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1 text-sm">
        <div className="flex items-center text-slate-600 font-medium"><Icon className="w-4 h-4 mr-1.5" /> {label}</div>
        <span className="font-bold text-slate-800">{progress}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );

  const DashboardView = () => (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center">
            <BookOpen className="w-8 h-8 mr-3 text-indigo-600" />
            Trazabilidad de Publicaciones
          </h1>
          <p className="text-slate-500 mt-1">Espacio de trabajo compartido. Los cambios se ven en todos los dispositivos.</p>
        </div>
        <div className="flex w-full md:w-auto gap-3">
          <button onClick={() => setCurrentView('settings')} className="flex-1 md:flex-none flex items-center justify-center bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition shadow-sm">
            <Settings className="w-5 h-5 mr-2" /> Procesos
          </button>
          <button onClick={() => setIsNewProjectModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm">
            <Plus className="w-5 h-5 mr-2" /> Nuevo
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600">No hay proyectos en este espacio</h3>
          <button onClick={() => setIsNewProjectModalOpen(true)} className="mt-6 text-indigo-600 font-medium hover:text-indigo-800">+ Crear el primer proyecto</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <div key={project.id} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col h-full" onClick={() => setSelectedProject(project)}>
              <div className="flex justify-between items-start mb-4 gap-2">
                <h3 className="font-bold text-lg text-slate-800 leading-tight flex-grow pr-2">{project.title}</h3>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); setEditProjectModal({ isOpen: true, projectId: project.id, newTitle: project.title }); }} className="text-slate-400 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 p-2 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={(e) => { e.stopPropagation(); confirmDeleteProject(project.id); }} className="text-slate-400 hover:text-red-600 bg-slate-100 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex-grow">
                <ProgressBar progress={calculateProgress(project, 'universidad')} colorClass="bg-blue-500" label="Trámite UC" icon={Building} />
                <ProgressBar progress={calculateProgress(project, 'publicacion')} colorClass="bg-emerald-500" label="Proceso IEEE" icon={GraduationCap} />
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
      <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-xl font-bold flex items-center ${textColor}`}><Icon className="w-6 h-6 mr-2" /> {title}</h2>
          <span className={`bg-opacity-10 px-3 py-1 rounded-full text-sm font-bold ${textColor} bg-current`}>{progress}%</span>
        </div>
        <div className="space-y-3 flex-grow">
          {masterProcess[track].map((step, index) => {
            const stepData = project.completedSteps?.[step.id];
            const isCompleted = !!stepData;
            return (
              <div key={step.id} className={`flex flex-col p-3 rounded-lg transition border ${isCompleted ? 'bg-slate-50 border-slate-200' : 'hover:bg-slate-50 border-transparent'}`}>
                <div className="flex items-start">
                  <div className="mt-0.5 flex-shrink-0 cursor-pointer p-1" onClick={() => toggleStep(project.id, step.id)}>
                    {isCompleted ? <CheckCircle2 className={`w-5 h-5 ${textColor}`} /> : <Circle className="w-5 h-5 text-slate-300 hover:text-indigo-400 transition" />}
                  </div>
                  <div className="ml-2 flex-grow cursor-pointer" onClick={() => toggleStep(project.id, step.id)}>
                    <p className={`text-sm md:text-base transition-all ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-700'}`}><span className="font-semibold mr-2 text-slate-400">{index + 1}.</span> {step.text}</p>
                  </div>
                </div>
                {isCompleted && (
                  <div className="ml-9 mt-2 flex flex-col items-start gap-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center text-xs text-slate-500 font-medium bg-white px-2 py-1 rounded border border-slate-200 shadow-sm"><Calendar className="w-3 h-3 mr-1" /> Completado el {formatDate(stepData.completedAt)}</div>
                    {stepData.note && <div className="text-sm text-slate-600 bg-yellow-50/50 border border-yellow-200/50 px-3 py-2 rounded-md w-full relative"><MessageSquare className="w-4 h-4 text-yellow-600 absolute top-2 right-2 opacity-30" /><p className="pr-6">{stepData.note}</p></div>}
                    <button onClick={() => setNoteModal({ isOpen: true, projectId: project.id, stepId: step.id, text: stepData.note || '' })} className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center mt-1"><MessageSquare className="w-3 h-3 mr-1" /> {stepData.note ? 'Editar nota' : '+ Añadir nota'}</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );

    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-200">
        <button onClick={() => setSelectedProject(null)} className="mb-6 flex items-center text-slate-500 hover:text-slate-800 transition font-medium"><ChevronRight className="w-5 h-5 mr-1 rotate-180" /> Volver al Tablero</button>
        <div className="mb-8 bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-grow">
            <div className="flex items-start md:items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">{project.title}</h1>
              <button onClick={() => setEditProjectModal({ isOpen: true, projectId: project.id, newTitle: project.title })} className="text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 p-2 rounded-lg transition-colors flex-shrink-0 mt-1 md:mt-0"><Edit2 className="w-5 h-5" /></button>
            </div>
            <p className="text-slate-500 text-sm">Proyecto creado el {formatDate(project.createdAt)}</p>
          </div>
          <button onClick={() => confirmDeleteProject(project.id)} className="flex items-center justify-center text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors border border-red-100 md:w-auto w-full flex-shrink-0"><Trash2 className="w-4 h-4 mr-2" /> Eliminar Proyecto</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-start">
          <ChecklistSection title="Incentivo Universidad Continental" track="universidad" icon={Building} textColor="text-blue-600" progress={calculateProgress(project, 'universidad')} />
          <ChecklistSection title="Proceso Editorial IEEE" track="publicacion" icon={GraduationCap} textColor="text-emerald-600" progress={calculateProgress(project, 'publicacion')} />
        </div>
      </div>
    );
  };

  const SettingsView = () => {
    const [newStepText, setNewStepText] = useState({ universidad: '', publicacion: '' });
    const handleAddStep = (track) => { addMasterStep(track, newStepText[track]); setNewStepText({ ...newStepText, [track]: '' }); };

    const ProcessEditor = ({ title, track, icon: Icon, colorClass }) => (
      <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
        <h2 className="text-xl font-bold flex items-center text-slate-800 mb-2"><Icon className={`w-6 h-6 mr-2 ${colorClass}`} /> {title}</h2>
        <p className="text-sm text-slate-500 mb-6">Esta plantilla aplica a todos los proyectos y se actualizará para todos los que usen la app.</p>
        <div className="space-y-2 mb-6 flex-grow">
          {masterProcess[track].map((step, index) => (
            <div key={step.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 transition-all">
              <span className="text-sm md:text-base text-slate-700 pr-2"><span className="font-bold mr-2 text-slate-400">{index + 1}.</span>{step.text}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => moveMasterStep(track, index, 'up')} disabled={index === 0} className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 p-1"><ArrowUp className="w-4 h-4" /></button>
                <button onClick={() => moveMasterStep(track, index, 'down')} disabled={index === masterProcess[track].length - 1} className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 p-1"><ArrowDown className="w-4 h-4" /></button>
                <div className="w-px h-5 bg-slate-300 mx-1"></div>
                <button onClick={() => confirmDeleteMasterStep(track, step.id)} className="text-slate-400 hover:text-red-500 p-1"><X className="w-5 h-5" /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-auto">
          <input type="text" placeholder="Añadir nuevo paso..." className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={newStepText[track]} onChange={(e) => setNewStepText({...newStepText, [track]: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && handleAddStep(track)} />
          <button onClick={() => handleAddStep(track)} disabled={!newStepText[track].trim()} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-100 transition disabled:opacity-50">Añadir</button>
        </div>
      </div>
    );

    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-200">
        <button onClick={() => setCurrentView('dashboard')} className="mb-6 flex items-center text-slate-500 hover:text-slate-800 transition font-medium"><ChevronRight className="w-5 h-5 mr-1 rotate-180" /> Volver al Tablero</button>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-8">Estructura Global de Procesos</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-start">
          <ProcessEditor title="Trámite Universidad Continental" track="universidad" icon={Building} colorClass="text-blue-500" />
          <ProcessEditor title="Proceso de Publicación IEEE" track="publicacion" icon={GraduationCap} colorClass="text-emerald-500" />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 pb-20">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-slate-800 cursor-pointer" onClick={() => { setSelectedProject(null); setCurrentView('dashboard'); }}>
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg"><LayoutDashboard className="w-5 h-5" /></div>
            <span>PubliTracker <span className="text-indigo-600">UC - IEEE</span></span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100" title="Todos los usuarios ven esta misma información">
            <Globe className="w-3.5 h-3.5" /> Espacio Global
          </div>
        </div>
      </nav>

      <main>{currentView === 'settings' ? <SettingsView /> : selectedProject ? <ProjectDetailView /> : <DashboardView />}</main>

      {/* MODALES */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-5">Nuevo Proyecto IEEE</h3>
            <form onSubmit={handleCreateProject}>
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-2">Título de la Publicación</label>
                <textarea className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24" placeholder="Ej: Analysis of machine learning algorithms..." value={newProjectTitle} onChange={(e) => setNewProjectTitle(e.target.value)} autoFocus />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsNewProjectModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition">Cancelar</button>
                <button type="submit" disabled={!newProjectTitle.trim()} className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">Crear Proyecto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editProjectModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-5 flex items-center"><Edit2 className="w-5 h-5 mr-2 text-indigo-600"/> Renombrar Proyecto</h3>
            <form onSubmit={saveProjectTitle}>
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-2">Nuevo Título</label>
                <textarea className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24" value={editProjectModal.newTitle} onChange={(e) => setEditProjectModal({...editProjectModal, newTitle: e.target.value})} autoFocus />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setEditProjectModal({ isOpen: false, projectId: null, newTitle: '' })} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition">Cancelar</button>
                <button type="submit" disabled={!editProjectModal.newTitle.trim()} className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteProjectModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-6 h-6 text-red-600" /></div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">¿Eliminar proyecto?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">Se borrará para todos de forma irreversible.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteProjectModal({ isOpen: false, projectId: null })} className="flex-1 px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition">Cancelar</button>
              <button onClick={executeDeleteProject} className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition">Eliminar</button>
            </div>
          </div>
        </div>
      )}
      
      {noteModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 mb-4"><MessageSquare className="w-5 h-5 text-indigo-600" /><h3 className="text-xl font-bold text-slate-800">Añadir Nota al Paso</h3></div>
            <textarea className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-32 mb-5" placeholder="Ej: Link del Paper en ScholarOne..." value={noteModal.text} onChange={(e) => setNoteModal({...noteModal, text: e.target.value})} autoFocus />
            <div className="flex justify-end gap-3">
              <button onClick={() => setNoteModal({...noteModal, isOpen: false})} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition">Cancelar</button>
              <button onClick={saveNote} className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {deleteStepModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-6 h-6 text-red-600" /></div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">¿Eliminar este paso de la plantilla?</h3>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteStepModal({ isOpen: false, track: null, stepId: null })} className="flex-1 px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition">Cancelar</button>
              <button onClick={executeDeleteMasterStep} className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}