import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './ExpoScreenTime.types';

type ExpoScreenTimeModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class ExpoScreenTimeModule extends NativeModule<ExpoScreenTimeModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(ExpoScreenTimeModule, 'ExpoScreenTimeModule');
