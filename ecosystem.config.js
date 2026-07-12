module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: './backend',
      script: './src/server.js',
    },
    {
      name: 'frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 0.0.0.0 -p 3000',
    },
  ],
};