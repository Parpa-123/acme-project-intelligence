import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SuperTokens, { SuperTokensWrapper } from 'supertokens-auth-react';
import ThirdParty, { Github, Google } from 'supertokens-auth-react/recipe/thirdparty';
import Session, { SessionAuth } from 'supertokens-auth-react/recipe/session';
import { ThirdPartyPreBuiltUI } from 'supertokens-auth-react/recipe/thirdparty/prebuiltui';
import { getSuperTokensRoutesForReactRouterDom } from 'supertokens-auth-react/ui';
import * as reactRouterDom from 'react-router-dom';

// Layouts & Pages
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProjectList } from './pages/projects/ProjectList';
import { ProjectWorkspace } from './pages/projects/ProjectWorkspace';
import { SettingsPage } from './pages/settings/SettingsPage';
import { AcceptInvitePage } from './pages/invites/AcceptInvite';
import { MeetingPreJoin } from './pages/meetings/MeetingPreJoin';
import { MeetingRoom } from './pages/meetings/MeetingRoom';
import { MeetingIntelligence } from './pages/meetings/MeetingIntelligence';

SuperTokens.init({
  appInfo: {
    appName: 'Project-1',
    apiDomain: 'http://localhost:8000',
    websiteDomain: 'http://localhost:3000',
    apiBasePath: '/auth',
    websiteBasePath: '/auth',
  },
  recipeList: [
    ThirdParty.init({
      signInAndUpFeature: {
        providers: [Github.init(), Google.init()],
      },
      getRedirectionURL: async (context: { action: string }) => {
        if (context.action === "SUCCESS") {
          return "/dashboard";
        }
      },
    }),
    Session.init(),
  ],
});

const App = () => {
  return (
    <SuperTokensWrapper>
      <BrowserRouter>
        <Routes>
          {getSuperTokensRoutesForReactRouterDom(reactRouterDom, [ThirdPartyPreBuiltUI])}
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Invitation Acceptance Route */}
          <Route 
            path="/invitations/:token" 
            element={
              <SessionAuth>
                <AcceptInvitePage />
              </SessionAuth>
            } 
          />

          {/* Authenticated App Shell */}
          <Route
            element={
              <SessionAuth>
                <AppLayout />
              </SessionAuth>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/:id" element={<ProjectWorkspace />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fullscreen Meeting Routes */}
          <Route
            element={
              <SessionAuth>
                <reactRouterDom.Outlet />
              </SessionAuth>
            }
          >
            <Route path="/projects/:projectId/spaces/:spaceId/join" element={<MeetingPreJoin />} />
            <Route path="/projects/:projectId/spaces/:spaceId/room" element={<MeetingRoom />} />
            <Route path="/projects/:projectId/spaces/:spaceId/meetings/:meetingId/intelligence" element={<MeetingIntelligence />} />
          </Route>
          
          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </SuperTokensWrapper>
  );
};

export default App;