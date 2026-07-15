import React from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import Navbar from '../components/Navbar';
import DashboardView from '../components/DashboardView';


export default function WorkspacePage() {
  return (
    <div className="dashboard-layout" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Navbar />

      <Tabs style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <TabList>
          <Tab>Dashboard</Tab>

        </TabList>

        <TabPanel style={{ flexGrow: 1, position: 'relative' }}>
          <DashboardView />
        </TabPanel>

      </Tabs>
    </div>
  );
}
