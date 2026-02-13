// components/TopMenu.tsx
"use client";

import React, {useState} from "react";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  // Removido DialogTrigger daqui, pois não será usado nos itens de menu
} from "@/components/ui/dialog";
import AddInventoryItemForm from "./AddInventoryItemForm";
import {ExcelUpload} from "./ExcelUpload";

interface TopMenuProps {
  onDataShouldRefresh?: () => void;
}

export function TopMenu({onDataShouldRefresh}: TopMenuProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleAddFormSuccess = () => {
    setIsAddModalOpen(false);
    onDataShouldRefresh?.();
  };

  const handleImportSuccess = () => {
    setIsImportModalOpen(false);
    onDataShouldRefresh?.();
  };

  return (
    <>
      {/* --- Modal Adicionar Livro --- */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Item no Inventário</DialogTitle>
            <DialogDescription> {/* ... */} </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {/* Assumindo que AddInventoryItemForm chama uma prop onSuccess que chama handleAddFormSuccess */}
            <AddInventoryItemForm /* onSuccess={handleAddFormSuccess} */ />
          </div>
        </DialogContent>
      </Dialog>

      {/* --- Modal Importar Planilha --- */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Importar Planilha de Livros</DialogTitle>
            <DialogDescription> {/* ... */} </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ExcelUpload onUploadSuccess={handleImportSuccess} />
          </div>
        </DialogContent>
      </Dialog>

      {/* --- Barra de Menu Principal --- */}
      <Menubar className="rounded-none border-b px-2 lg:px-4">
        <MenubarMenu>
          <MenubarTrigger>Arquivo</MenubarTrigger>
          {/* ... conteúdo ... */}
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>Cadastros</MenubarTrigger>
          <MenubarContent>
            {/* --- CORREÇÃO: Removido DialogTrigger --- */}
            {/* O onClick chama diretamente o setState para abrir o Dialog */}
            <MenubarItem onClick={() => setIsAddModalOpen(true)}>
              Novo Livro... <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            {/* --- Fim da Correção --- */}

            <MenubarSeparator />

            {/* --- CORREÇÃO: Removido DialogTrigger --- */}
            {/* O onClick chama diretamente o setState para abrir o Dialog */}
            <MenubarItem onClick={() => setIsImportModalOpen(true)}>
              Importar Planilha...
            </MenubarItem>
            {/* --- Fim da Correção --- */}

            <MenubarSeparator />
            <MenubarItem>Consultar Livros</MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Clientes</MenubarSubTrigger>
              {/* ... sub-itens ... */}
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
        {/* Outros Menus ... */}
      </Menubar>
    </>
  );
}
