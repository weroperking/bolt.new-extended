import React from 'react';

export function SubMenu() {
  //const version = __APP_VERSION__;
  return (
    <div className="fixed top-[var(--header-height)] bottom-0 z-10 flex flex-col items-center justify-end pl-2.5 py-3">
      {/* <div className="text-xs text-center text-bolt-elements-textTertiary">Bolt-extended <br /> v{version}</div> */}
      <div className="i-ph:sidebar-simple-duotone text-xl text-bolt-elements-textSecondary" />
    </div>
  );
}
