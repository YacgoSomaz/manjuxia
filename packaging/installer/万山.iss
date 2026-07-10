#ifndef MyAppVersion
  #define MyAppVersion "0.1.0"
#endif
#ifndef ReleaseDir
  #define ReleaseDir "packaging/release/万山-0.1.0"
#endif

[Setup]
AppId={{9C55C55B-6C51-4E20-9BA0-WSHANSOFT0001}
AppName=万山
AppVersion={#MyAppVersion}
DefaultDirName={autopf}\万山
DefaultGroupName=万山
OutputDir=packaging\release
OutputBaseFilename=万山Setup_{#MyAppVersion}
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64
Uninstallable=yes

[InstallDelete]
Type: filesandordirs; Name: "{app}\src"
Type: filesandordirs; Name: "{app}\prompts"
Type: filesandordirs; Name: "{app}\docs"
Type: filesandordirs; Name: "{app}\test-artifacts"
Type: filesandordirs; Name: "{app}\cache"
Type: filesandordirs; Name: "{app}\logs"
Type: filesandordirs; Name: "{app}\temp"
Type: filesandordirs; Name: "{app}\tmp"
Type: filesandordirs; Name: "{app}\backend\data"
Type: files; Name: "{app}\*.py"
Type: files; Name: "{app}\*.pyc"
Type: files; Name: "{app}\*.pyo"
Type: files; Name: "{app}\*.env"
Type: files; Name: "{app}\*.map"
Type: files; Name: "{app}\*.md"
Type: files; Name: "{app}\*.tmp"
Type: files; Name: "{app}\*.bak"

[Files]
Source: "{#ReleaseDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\万山"; Filename: "{app}\万山.exe"
Name: "{autodesktop}\万山"; Filename: "{app}\万山.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "附加图标："

[Run]
Filename: "{app}\万山.exe"; Description: "启动万山"; Flags: nowait postinstall skipifsilent
