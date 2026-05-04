import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import obfuscator from 'rollup-plugin-javascript-obfuscator';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
    obfuscator({
      globalOptions: {
        debugProtection: true, // কেউ ইনস্পেক্ট করলে ব্রাউজার ফ্রিজ হতে পারে
        disableConsoleOutput: true,
        stringArray: true,
        stringArrayThreshold: 0.75,
        compact: true,
        controlFlowFlattening: true, // লজিক রিড করা অনেক কঠিন করে দিবে
      },
    }),
  ],
  build: {
    sourcemap: false, // ব্রাউজারে আসল কোড দেখাবে না
    minify: 'terser', // কোডকে ছোট এবং হিজিবিজি করবে
    terserOptions: {
      compress: {
        drop_console: true, // কনসোল লগগুলো মুছে দিবে (সিকিউরিটির জন্য ভালো)
      },
    },
  },
});