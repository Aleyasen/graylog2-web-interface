import React from 'react';
import $ from 'jquery';

import TrendConfigurationModal from './TrendConfigurationModal';
import EditDashboardModalTrigger from './EditDashboardModalTrigger';
import DashboardListPage from './DashboardListPage';
import Dashboard from './Dashboard';
import DashboardStore from 'stores/dashboard/DashboardStore';

let component;

const dialogConfigurationDiv = document.getElementById('react-dashboard-widget-configuration-dialog');
if (dialogConfigurationDiv) {
  component = React.render(<TrendConfigurationModal />, dialogConfigurationDiv);
  // XXX: to make it accessible from jquery based code
  if (window) {
    window.trendDialogConfiguration = component;
  }
}

$('.react-edit-dashboard').each(function () {
  const id = this.getAttribute('data-dashboard-id');
  const title = this.getAttribute('data-dashboard-title');
  const description = this.getAttribute('data-dashboard-description');
  const buttonClass = this.getAttribute('data-button-class');
  const content = this.innerHTML;

  component = (
    <EditDashboardModalTrigger id={id} action="edit" title={title} description={description} buttonClass={buttonClass}>
      {content}
    </EditDashboardModalTrigger>
  );

  React.render(component, this);
});

const dashboardListPage = document.getElementById('react-dashboard-list-page');
if (dashboardListPage) {
  const permissions = JSON.parse(dashboardListPage.getAttribute('data-permissions'));
  const username = dashboardListPage.getAttribute('data-user-name');
  component = <DashboardListPage permissions={permissions} username={username}/>;

  React.render(component, dashboardListPage);
}

const reactDashboards = document.getElementsByClassName('react-dashboard');
for (let i = 0; i < reactDashboards.length; i++) {
  const dashboard = reactDashboards[i];
  const dashboardId = dashboard.getAttribute('data-dashboard-id');
  const widgets = DashboardStore.dashboardsAsList(JSON.parse(dashboard.getAttribute('data-dashboard-widgets')));

  component = <Dashboard id={dashboardId} widgets={widgets}/>;

  React.render(component, dashboard);
}
