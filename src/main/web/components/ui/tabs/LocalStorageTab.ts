import { BrowserPersistence } from "platform/components/utils";

interface StateProp {
  readonly sourceId?: string;
  readonly defaultTabKey?: any;
}

export class LocaleStorageTabs {
  private localStorageState = BrowserPersistence.adapter<any>();

  private KEY = 'form-default-key'

  getValues():StateProp {
    return this.localStorageState.get(this.KEY)
  }

  getTabKeyBySource(sourceId: string):string {
    return this.localStorageState.get(this.KEY)[sourceId]
  }

  setValues(values: StateProp) {
    const newValue = {}
    newValue[values.sourceId]=values.defaultTabKey
    this.localStorageState.update(this.KEY, newValue)
  }

  removeKey() {
    this.localStorageState.remove(this.KEY)
  }
}

export const localeStorageTabs = new LocaleStorageTabs()