import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage, normalizePaginatedResponse } from '../../../shared/utils/apiUtils';
import type { FolderItem, UserOption } from '../../../shared/types';
import { foldersService } from '../services/foldersService';
import { usersService } from '../../users/services/usersService';

// ── Types ────────────────────────────────────────────────

export type Combination = {
  folderName: string;
  userId: string;
  conflict: boolean;
};

export type CreationResult = {
  folderName: string;
  userId: string;
  status: 'fulfilled' | 'rejected';
  error?: string;
};

export type UseBulkFolderCreationReturn = {
  // Navegação
  step: 1 | 2 | 3;
  nextStep: () => Promise<void>;
  prevStep: () => void;

  // Etapa 1 — pastas
  folderNames: string[];
  folderInput: string;
  setFolderInput: (value: string) => void;
  addFolder: () => void;
  removeFolder: (name: string) => void;
  folderInputError: string | null;

  // Etapa 2 — usuários
  usersOptions: UserOption[];
  selectedUserIds: Set<string>;
  toggleUser: (userId: string) => void;
  selectAllUsers: () => void;

  // Etapa 3 — revisão + confirmação
  combinations: Combination[];
  creationResults: CreationResult[];
  confirming: boolean;
  confirm: () => Promise<void>;

  // Erros de carga
  loadError: string | null;
  loadingUsers: boolean;
};

// ── Helpers de paginação ─────────────────────────────────

async function fetchAllRootFolders(): Promise<FolderItem[]> {
  const all: FolderItem[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const raw = await foldersService.list({ rootsOnly: true, page, limit: 100 });
    const parsed = normalizePaginatedResponse<FolderItem>(raw, page, 100);
    all.push(...parsed.items);
    hasMore = parsed.isLegacyArray ? false : parsed.meta.hasNextPage;
    page += 1;
  }

  return all;
}

async function fetchAllUsers(): Promise<UserOption[]> {
  const all: UserOption[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const raw = await usersService.list({ page, limit: 100 });
    const parsed = normalizePaginatedResponse<UserOption>(raw, page, 100);
    all.push(...parsed.items);
    hasMore = parsed.isLegacyArray ? false : parsed.meta.hasNextPage;
    page += 1;
  }

  return all;
}

// ── Hook ─────────────────────────────────────────────────

export function useBulkFolderCreation(): UseBulkFolderCreationReturn {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ── Etapa 1 ──────────────────────────────────────────
  const [folderNames, setFolderNames] = useState<string[]>([]);
  const [folderInput, setFolderInput] = useState('');
  const [folderInputError, setFolderInputError] = useState<string | null>(null);

  // ── Etapa 2 ──────────────────────────────────────────
  const [usersOptions, setUsersOptions] = useState<UserOption[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Etapa 3 ──────────────────────────────────────────
  const [combinations, setCombinations] = useState<Combination[]>([]);
  const [creationResults, setCreationResults] = useState<CreationResult[]>([]);
  const [confirming, setConfirming] = useState(false);

  // ── Carga de usuários (ao montar) ────────────────────

  useEffect(() => {
    async function loadUsers() {
      setLoadingUsers(true);
      setLoadError(null);
      try {
        const users = await fetchAllUsers();
        setUsersOptions(users);
      } catch (err) {
        setLoadError(getApiErrorMessage(err, 'Erro ao carregar usuários.'));
      } finally {
        setLoadingUsers(false);
      }
    }
    void loadUsers();
  }, []);

  // ── Etapa 1: adicionar/remover pastas ────────────────

  const addFolder = useCallback(() => {
    const name = folderInput.trim();
    if (!name) {
      setFolderInputError('Digite um nome para a pasta.');
      return;
    }
    const duplicate = folderNames.some((n) => n.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      setFolderInputError('Já existe uma pasta com esse nome na lista.');
      return;
    }
    setFolderNames((prev) => [...prev, name]);
    setFolderInput('');
    setFolderInputError(null);
  }, [folderInput, folderNames]);

  const removeFolder = useCallback((name: string) => {
    setFolderNames((prev) => prev.filter((n) => n !== name));
  }, []);

  // ── Etapa 2: selecionar usuários ─────────────────────

  const toggleUser = useCallback((userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const selectAllUsers = useCallback(() => {
    setSelectedUserIds((prev) => {
      const allSelected = usersOptions.every((u) => prev.has(u.id));
      if (allSelected) return new Set();
      return new Set(usersOptions.map((u) => u.id));
    });
  }, [usersOptions]);

  // ── Navegação entre etapas ───────────────────────────

  const nextStep = useCallback(async () => {
    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) {
      // Transição 2 → 3: calcular conflitos
      let allFolders: FolderItem[] = [];
      try {
        allFolders = await fetchAllRootFolders();
      } catch {
        // sem pastas carregadas: nenhum conflito detectado
      }

      const userIds = [...selectedUserIds];
      const combos: Combination[] = [];

      for (const folderName of folderNames) {
        for (const userId of userIds) {
          const conflict = allFolders.some(
            (f) => f.userId === userId && f.name.toLowerCase() === folderName.toLowerCase(),
          );
          combos.push({ folderName, userId, conflict });
        }
      }

      setCombinations(combos);
      setCreationResults([]);
      setStep(3);
    }
  }, [step, folderNames, selectedUserIds]);

  const prevStep = useCallback(() => {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  }, [step]);

  // ── Etapa 3: confirmar criação ───────────────────────

  const confirm = useCallback(async () => {
    const valid = combinations.filter((c) => !c.conflict);
    if (valid.length === 0) return;

    setConfirming(true);

    const tasks = valid.map((c) =>
      foldersService
        .create({ name: c.folderName, userId: c.userId })
        .then((): CreationResult => ({ folderName: c.folderName, userId: c.userId, status: 'fulfilled' }))
        .catch((err): CreationResult => ({
          folderName: c.folderName,
          userId: c.userId,
          status: 'rejected',
          error: getApiErrorMessage(err, 'Erro ao criar pasta.'),
        })),
    );

    const settled = await Promise.allSettled(tasks);

    const results: CreationResult[] = settled.map((r) =>
      r.status === 'fulfilled' ? r.value : { folderName: '', userId: '', status: 'rejected', error: 'Erro inesperado.' },
    );

    setCreationResults(results);
    setConfirming(false);
  }, [combinations]);

  return {
    step,
    nextStep,
    prevStep,
    folderNames,
    folderInput,
    setFolderInput,
    addFolder,
    removeFolder,
    folderInputError,
    usersOptions,
    selectedUserIds,
    toggleUser,
    selectAllUsers,
    combinations,
    creationResults,
    confirming,
    confirm,
    loadError,
    loadingUsers,
  };
}
