import { BackgroundController } from './background-controller.js';

console.log('🚀 Starting Background Controller...');

const backgroundController = new BackgroundController();

backgroundController.run().catch(e => console.error(e));

console.log('✅ Background Controller initialized');