#ifndef MyAppVersion
  #define MyAppVersion "0.1.0"
#endif
#ifndef ReleaseDir
  #define ReleaseDir "packaging/release/漫剧虾-0.1.0"
#endif
#ifndef InstallerOutputDir
  #define InstallerOutputDir "packaging/release"
#endif

[Setup]
AppId={{9C55C55B-6C51-4E20-9BA0-57A150F00001}
AppName=漫剧虾
AppVersion={#MyAppVersion}
DefaultDirName={autopf}\漫剧虾
DefaultGroupName=漫剧虾
OutputDir={#InstallerOutputDir}
OutputBaseFilename=漫剧虾Setup_{#MyAppVersion}
SetupIconFile={#ReleaseDir}\resources\frontend\assets\manjuxia-app-icon.ico
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
Uninstallable=yes
UninstallFilesDir={commonappdata}\万山\uninstall
CloseApplications=no
RestartApplications=no
#ifdef InnoSignTool
; build_release.ps1 injects the command only when a real certificate is provided.
SignTool=manjuxia
SignedUninstaller=yes
#endif

[Languages]
Name: "chinesesimplified"; MessagesFile: "ChineseSimplified.isl"

[InstallDelete]
; A release is self-contained. Remove prior runtime trees before copying a new
; signed manifest so stale Electron/backend files cannot break the next launch.
Type: filesandordirs; Name: "{app}\resources"
Type: filesandordirs; Name: "{app}\locales"
Type: filesandordirs; Name: "{app}\backend-dist"
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
Type: files; Name: "{app}\*.dll"
Type: files; Name: "{app}\*.pak"
Type: files; Name: "{app}\*.bin"
Type: files; Name: "{app}\*.dat"
Type: files; Name: "{app}\*.exe"
Type: files; Name: "{app}\version"

[Files]
Source: "{#ReleaseDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\漫剧虾"; Filename: "{app}\漫剧虾.exe"; IconFilename: "{app}\resources\frontend\assets\manjuxia-app-icon.ico"
Name: "{autodesktop}\漫剧虾"; Filename: "{app}\漫剧虾.exe"; IconFilename: "{app}\resources\frontend\assets\manjuxia-app-icon.ico"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "附加图标："

[Run]
Filename: "{app}\漫剧虾.exe"; Description: "启动漫剧虾"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Application binaries are disposable. User projects, login cache and model
; settings live under AppData and are deliberately retained for reinstall.
Type: filesandordirs; Name: "{app}"

[Code]
const
  UninstallRegistryKey = 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{9C55C55B-6C51-4E20-9BA0-57A150F00001}_is1';

function ReadInstalledValue(const ValueName: String; var Value: String): Boolean;
begin
  Result := RegQueryStringValue(HKLM64, UninstallRegistryKey, ValueName, Value);
  if not Result then
    Result := RegQueryStringValue(HKLM32, UninstallRegistryKey, ValueName, Value);
end;

function VersionPart(const Version: String; const PartIndex: Integer): Integer;
var
  Remaining, Token: String;
  CurrentPart, Separator, Index: Integer;
begin
  Remaining := Version;
  Token := '';
  for CurrentPart := 1 to PartIndex do begin
    Separator := Pos('.', Remaining);
    if Separator > 0 then begin
      Token := Copy(Remaining, 1, Separator - 1);
      Delete(Remaining, 1, Separator);
    end else begin
      Token := Remaining;
      Remaining := '';
    end;
  end;
  for Index := 1 to Length(Token) do begin
    if (Token[Index] < '0') or (Token[Index] > '9') then begin
      Token := Copy(Token, 1, Index - 1);
      break;
    end;
  end;
  Result := StrToIntDef(Token, 0);
end;

function CompareVersions(const LeftVersion, RightVersion: String): Integer;
var
  Index, LeftPart, RightPart: Integer;
begin
  Result := 0;
  for Index := 1 to 4 do begin
    LeftPart := VersionPart(LeftVersion, Index);
    RightPart := VersionPart(RightVersion, Index);
    if LeftPart > RightPart then begin
      Result := 1;
      exit;
    end;
    if LeftPart < RightPart then begin
      Result := -1;
      exit;
    end;
  end;
end;

function LaunchExistingInstallation(): Boolean;
var
  InstallLocation, ExePath: String;
  ResultCode: Integer;
begin
  Result := False;
  if not ReadInstalledValue('InstallLocation', InstallLocation) then
    exit;
  ExePath := AddBackslash(InstallLocation) + '漫剧虾.exe';
  if not FileExists(ExePath) then
    exit;
  if ShellExec('', ExePath, '', InstallLocation, SW_SHOWNORMAL, ewNoWait, ResultCode) then
    Result := True
  else
    MsgBox('检测到已安装的漫剧虾，但无法启动：' + #13#10 + ExePath, mbError, MB_OK);
end;

function InitializeSetup(): Boolean;
var
  InstalledVersion: String;
begin
  Result := True;
  if ReadInstalledValue('DisplayVersion', InstalledVersion) and
     (CompareVersions(InstalledVersion, '{#MyAppVersion}') >= 0) then begin
    { Same or older installers should act like a launcher. Newer installers continue as upgrades. }
    if LaunchExistingInstallation() then begin
      Result := False;
      exit;
    end;
  end;
end;

function IsProcessRunning(const ImageName: String): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec(ExpandConstant('{cmd}'), '/c tasklist /FI "IMAGENAME eq ' + ImageName + '" /NH | findstr /I /C:"' + ImageName + '" >nul', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function IsManJuXiaProcessRunning(): Boolean;
begin
  Result := IsProcessRunning('漫剧虾.exe') or IsProcessRunning('backend-launcher.exe') or IsProcessRunning('backend-server.exe');
end;

procedure StopManJuXia();
var
  ResultCode: Integer;
begin
  { Electron parent and its backend children must be gone before files are replaced. }
  Exec('taskkill.exe', '/F /T /IM "漫剧虾.exe"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Exec('taskkill.exe', '/F /T /IM "backend-launcher.exe"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Exec('taskkill.exe', '/F /T /IM "backend-server.exe"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

function StopAndWaitForManJuXia(): Boolean;
var
  Index: Integer;
begin
  StopManJuXia();
  for Index := 1 to 12 do begin
    if not IsManJuXiaProcessRunning() then begin
      Result := True;
      exit;
    end;
    Sleep(1000);
  end;
  Result := not IsManJuXiaProcessRunning();
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  if StopAndWaitForManJuXia() then
    Result := ''
  else
    Result := '无法关闭正在运行的漫剧虾。请先退出软件及其后台进程后再重试安装。';
end;

function InitializeUninstall(): Boolean;
begin
  Result := StopAndWaitForManJuXia();
  if not Result then begin
    MsgBox('漫剧虾仍在运行。请先退出软件及其后台进程后再重新卸载。', mbError, MB_OK);
  end;
end;
