import { i18n } from "@nocobase/portal-sdk/i18n";
import { exportMessages as enUS } from "./en-US";
import { exportMessages as zhCN } from "./zh-CN";

i18n.addResourceBundle("en-US", "nocobase-export", enUS, true, true);
i18n.addResourceBundle("zh-CN", "nocobase-export", zhCN, true, true);
