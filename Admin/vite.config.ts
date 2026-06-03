import { defineConfig, loadEnv, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/** Published @machonharuach packages still import @churchapps/* in their dist output. */
const machonharuachPkg = (name: string) =>
  path.resolve(__dirname, `node_modules/@machonharuach/${name}`);

const churchappsAliases: Record<string, string> = {
  '@churchapps/helpers': machonharuachPkg('helpers'),
  '@churchapps/apphelper': machonharuachPkg('apphelper'),
  '@churchapps/apphelper-donations': machonharuachPkg('apphelper-donations'),
  '@churchapps/apphelper-forms': machonharuachPkg('apphelper-forms'),
  '@churchapps/apphelper-login': machonharuachPkg('apphelper-login'),
  '@churchapps/apphelper-markdown': machonharuachPkg('apphelper-markdown'),
  '@churchapps/apphelper-website': machonharuachPkg('apphelper-website'),
  '@churchapps/content-providers': machonharuachPkg('content-providers'),
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['PORT', "REACT_APP"]);
  return {
    plugins: [react()],

    optimizeDeps: {
      // Patched postinstall edits node_modules; Vite's pre-bundle cache (.vite/deps) would
      // otherwise keep stale snapshots (login appName, UserMenu switchers hidden, FileHelper, etc.).
      exclude: ['@machonharuach/apphelper-login', '@machonharuach/apphelper', '@machonharuach/helpers'],
    },

    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React libraries
            vendor: ['react', 'react-dom'],
            
            // Router and related
            router: ['react-router-dom'],
            
            // Material-UI components and icons
            mui: ['@mui/material', '@mui/icons-material'],
            
            // Church Apps helpers
            churchapps: ['@machonharuach/apphelper', '@machonharuach/helpers'],
            
            // Drag and drop functionality
            dnd: ['react-dnd', 'react-dnd-html5-backend'],
            
            // Form and utility libraries
            utilities: ['react-cookie', 'axios', 'cropperjs', 'react-cropper'],
            
            // Feature-based chunks for large modules
            people: ['./src/people/PeoplePage', './src/people/PersonPage'],
            groups: ['./src/groups/GroupsPage', './src/groups/GroupPage'],
            donations: ['./src/donations/DonationsPage', './src/donations/DonationBatchPage', './src/donations/DonationBatchesPage', './src/donations/FundPage', './src/donations/FundsPage'],
            forms: ['./src/forms/FormsPage', './src/forms/FormPage'],
            serving: ['./src/serving/ServingPage', './src/serving/plans/PlanPage', './src/serving/planTypes/PlanTypePage'],
            songs: ['./src/serving/songs/SongsPage', './src/serving/songs/SongPage'],
            tasks: ['./src/serving/tasks/TasksPage', './src/serving/tasks/TaskPage', './src/serving/tasks/automations/AutomationsPage'],
            admin: ['./src/serverAdmin/AdminPage', './src/serverAdmin/ReportPage'],
            reports: ['./src/reports/ReportsPage', './src/reports/ReportPage']
          }
        },
        maxParallelFileOps: 2
      },
      chunkSizeWarningLimit: 1000,
      minify: 'esbuild',
      target: 'es2020'
    },
    resolve: {
      alias: {
        ...churchappsAliases,
        '@machonharuach/apphelper-login': path.resolve(__dirname, '../Packages/apphelper/src/login/index.ts'),
        'cropperjs/dist/cropper.css': path.resolve(__dirname, 'node_modules/cropperjs/dist/cropper.css'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: Number(env.PORT) ?? 3101,
      strictPort: true,
      open: false,
    },
    preview: {
      port: Number(env.PORT) ?? 3101,
      strictPort: true,
      open: true,
    },
    define: {
      // defining REACT_APP_ and NEXT_PUBLIC_ variables so we can phase REACT_APP_ out
      'process.env.REACT_APP_STAGE': JSON.stringify(env.REACT_APP_STAGE),
      'process.env.REACT_APP_DEFAULT_CHURCH_ID': JSON.stringify(env.REACT_APP_DEFAULT_CHURCH_ID),
      'process.env.REACT_APP_LOCK_CHURCH_ID': JSON.stringify(env.REACT_APP_LOCK_CHURCH_ID),
      'process.env.REACT_APP_ATTENDANCE_API': JSON.stringify(env.REACT_APP_ATTENDANCE_API),
      'process.env.REACT_APP_DOING_API': JSON.stringify(env.REACT_APP_DOING_API),
      'process.env.REACT_APP_GIVING_API': JSON.stringify(env.REACT_APP_GIVING_API),
      'process.env.REACT_APP_MEMBERSHIP_API': JSON.stringify(env.REACT_APP_MEMBERSHIP_API),
      'process.env.REACT_APP_REPORTING_API': JSON.stringify(env.REACT_APP_REPORTING_API),
      'process.env.REACT_APP_MESSAGING_API': JSON.stringify(env.REACT_APP_MESSAGING_API),
      'process.env.REACT_APP_MESSAGING_API_SOCKET': JSON.stringify(env.REACT_APP_MESSAGING_API_SOCKET),
      'process.env.REACT_APP_CONTENT_API': JSON.stringify(env.REACT_APP_CONTENT_API),
      'process.env.REACT_APP_LESSONS_API': JSON.stringify(env.REACT_APP_LESSONS_API),
      'process.env.REACT_APP_GOOGLE_ANALYTICS': JSON.stringify(env.REACT_APP_GOOGLE_ANALYTICS),
      'process.env.REACT_APP_CONTENT_ROOT': JSON.stringify(env.REACT_APP_CONTENT_ROOT),
      'process.env.REACT_APP_B1_ROOT': JSON.stringify(env.REACT_APP_B1_ROOT),
      'process.env.REACT_APP_B1ADMIN_ROOT': JSON.stringify(env.REACT_APP_B1ADMIN_ROOT),
      'process.env.REACT_APP_LESSONS_ROOT': JSON.stringify(env.REACT_APP_LESSONS_ROOT),
      'process.env.NEXT_PUBLIC_STAGE': JSON.stringify(env.REACT_APP_STAGE),
      'process.env.NEXT_PUBLIC_ATTENDANCE_API': JSON.stringify(env.REACT_APP_ATTENDANCE_API),
      'process.env.NEXT_PUBLIC_DOING_API': JSON.stringify(env.REACT_APP_DOING_API),
      'process.env.NEXT_PUBLIC_GIVING_API': JSON.stringify(env.REACT_APP_GIVING_API),
      'process.env.NEXT_PUBLIC_MEMBERSHIP_API': JSON.stringify(env.REACT_APP_MEMBERSHIP_API),
      'process.env.NEXT_PUBLIC_REPORTING_API': JSON.stringify(env.REACT_APP_REPORTING_API),
      'process.env.NEXT_PUBLIC_MESSAGING_API': JSON.stringify(env.REACT_APP_MESSAGING_API),
      'process.env.NEXT_PUBLIC_MESSAGING_API_SOCKET': JSON.stringify(env.REACT_APP_MESSAGING_API_SOCKET),
      'process.env.NEXT_PUBLIC_CONTENT_API': JSON.stringify(env.REACT_APP_CONTENT_API),
      'process.env.NEXT_PUBLIC_LESSONS_API': JSON.stringify(env.REACT_APP_LESSONS_API),
      'process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS': JSON.stringify(env.REACT_APP_GOOGLE_ANALYTICS),
      'process.env.NEXT_PUBLIC_CONTENT_ROOT': JSON.stringify(env.REACT_APP_CONTENT_ROOT),
      'process.env.NEXT_PUBLIC_B1_ROOT': JSON.stringify(env.REACT_APP_B1_ROOT),
      'process.env.NEXT_PUBLIC_B1ADMIN_ROOT': JSON.stringify(env.REACT_APP_B1ADMIN_ROOT),
      'process.env.NEXT_PUBLIC_LESSONS_ROOT': JSON.stringify(env.REACT_APP_LESSONS_ROOT),
      'process.env.REACT_APP_CHAT_MODE': JSON.stringify(env.REACT_APP_CHAT_MODE),
    },
  } satisfies UserConfig;
});
