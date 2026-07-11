{
  description = "Inkdrop Codex extension development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_24
            pnpm
            llvm
            clang
            pkg-config
            libsecret
          ];

          shellHook = ''
            export PNPM_HOME="$PWD/.pnpm-store/bin"
            export PATH="$PNPM_HOME:$PATH"
            export PERRY_CC="${pkgs.clang}/bin/clang"
          '';
        };
      });
}
