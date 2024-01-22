import { BrowserPersistence } from "platform/components/utils";

interface StateProp {
  readonly sourceId?: string;
  readonly defaultTabKey?: any;
}

export class LocaleStorageTabs {
  private localStorageState = BrowserPersistence.adapter<StateProp>();

  private KEY = 'form-default-key'

  getValues():StateProp {
    return this.localStorageState.get(this.KEY)
  }

  setValues(values: StateProp) {
    this.localStorageState.set(this.KEY, values)
  }

  removeKey() {
    this.localStorageState.remove(this.KEY)
  }
}

export const localeStorageTabs = new LocaleStorageTabs()