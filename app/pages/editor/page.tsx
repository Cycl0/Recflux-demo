"use client";

import { useState } from "react";
import NavBar from '@/components/NavBar';
import { Avatar, Dropdown } from "flowbite-react";
import { useResizable } from 'react-resizable-layout';

export default function Home() {
  const [index, setIndex] = useState(-1);

  function nextImageHandler() {
    setIndex((prevIndex) => prevIndex + 1);
  }

  const { position, separatorProps } = useResizable({
    axis: 'x',
  })
  return (
    <>
      <NavBar>
        <Dropdown
          arrowIcon={false}
          inline
          label={
            <Avatar alt="User settings" img="/images/icon.png" rounded />
          }
        >
          <Dropdown.Header>
            <span className="block text-sm">Lucas</span>
            <span className="block truncate text-sm font-medium">lucas@email.com</span>
          </Dropdown.Header>
          <Dropdown.Item>Dashboard</Dropdown.Item>
          <Dropdown.Item>Configurações</Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item>Sair</Dropdown.Item>
        </Dropdown>
      </NavBar>
      <main className="bg-blue-gradient flex justify-between items-center space-x-2">
        <div className={`
          flex-1 min-h-screen items-center justify-between py-20 px-12
          backdrop-blur-2xl bg-black/[.03] shadow-gradient-2 rounded-md`}
        style={{ width: position }}>
        </div>
        <hr {...separatorProps} />
        <div className={`
          flex-1 min-h-screen items-center justify-between py-20 px-12
          backdrop-blur-2xl bg-black/[.03] shadow-gradient-2 rounded-md`}
          style={{ width: position }}>
        </div>
        <hr {...separatorProps} />
        <div className={`
          flex-1 min-h-screen items-center justify-between py-20 px-12
          backdrop-blur-2xl bg-black/[.03] shadow-gradient-2 rounded-md`}>

        </div>
      </main>
    </>
  );
}
