import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersService } from '../services/usersService';
import { getApiErrorMessage } from '../../../shared/utils/apiUtils';

type Step = 1 | 2 | 3;
type Direction = 'forward' | 'back';

export function useCreateUser() {
  const navigate = useNavigate();

  // ── Wizard navigation ─────────────────────────────────
  const [step, setStep]           = useState<Step>(1);
  const [direction, setDirection] = useState<Direction>('forward');

  // ── Step 1: Identity ──────────────────────────────────
  const [name, setName]                       = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordsMatch     = password === confirmPassword;
  const passwordLongEnough = password.length >= 6;
  const step1Valid =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    passwordLongEnough &&
    passwordsMatch;

  // ── Step 2: Folders ───────────────────────────────────
  const [folders, setFolders]         = useState<string[]>([]);
  const [folderInput, setFolderInput] = useState('');

  function addFolder() {
    const trimmed = folderInput.trim();
    if (!trimmed || folders.includes(trimmed)) return;
    setFolders((prev) => [...prev, trimmed]);
    setFolderInput('');
  }

  function removeFolder(index: number) {
    setFolders((prev) => prev.filter((_, i) => i !== index));
  }

  function handleFolderKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addFolder();
    }
  }

  // ── Step 3: Submit ────────────────────────────────────
  const [loading, setLoading]       = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Navigation ────────────────────────────────────────
  function goNext() {
    if (step === 1 && !step1Valid) return;
    setDirection('forward');
    setStep((prev) => Math.min(prev + 1, 3) as Step);
  }

  function goBack() {
    setDirection('back');
    setStep((prev) => Math.max(prev - 1, 1) as Step);
  }

  // ── Submit ────────────────────────────────────────────
  async function handleSubmit() {
    setLoading(true);
    setSubmitError(null);

    try {
      await usersService.create({
        name: name.trim(),
        email: email.trim(),
        password,
        folders: folders.length > 0 ? folders : undefined,
      });
      navigate('/users');
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, 'Erro ao criar usuário.'));
    } finally {
      setLoading(false);
    }
  }

  return {
    // Navigation
    step, direction,
    goNext, goBack,
    // Step 1
    name, setName,
    email, setEmail,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    step1Valid, passwordsMatch, passwordLongEnough,
    // Step 2
    folders, folderInput, setFolderInput,
    addFolder, removeFolder, handleFolderKeyDown,
    // Step 3
    loading, submitError,
    handleSubmit,
  };
}
