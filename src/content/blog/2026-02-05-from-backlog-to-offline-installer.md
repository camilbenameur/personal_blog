---
title: "From Backlog to MVP: Building an Offline Industrial Installer in Go"
description: "How I designed and built, as an intern, an installer for air-gapped industrial PCs: offline Docker installs pinned to one version, and what I learned doing it."
author: "Camil Benameur"
pubDate: 2026-02-05
updatedDate: 2026-09-29
correction:
  date: 2026-09-29
  text: "I removed claims I could not back up: that a manual install took hours and dropped to minutes, that the installer scaled to fleets, that the result was reproducible and less error-prone, that it ran in production, and that there were strict deployment windows. I also removed statements about my teammates and about working mostly alone, described the starting point as a need rather than a client request, softened some general claims about industrial PCs, and added that I owned the project until March 2026."
tags: ["go", "architecture", "devops", "offline", "installation", "industrial"]
slug: "from-backlog-to-offline-installer"
---

## The Moment It Started

This project began as a backlog item with a clear need, but nobody with the time to run a POC. I joined as an intern and designed and built the first version. The context was simple to describe and hard to execute: install industrial automation software on industrial PCs that often have no internet access.

There was no installer. Only requirements. The design started from scratch.

## The Real-World Constraints

Industrial PCs are not like dev laptops. You often cannot assume:

- Internet access.
- A local screen, keyboard, or mouse.
- Flexible versions of system packages.

What does exist are strict cybersecurity requirements, limited access, and a need for predictability. The installer had to work offline and behave predictably.

## Architecture Choices That Made It Possible

I picked a hexagonal architecture in Go early. It let me keep the domain clean, testable, and maintainable while the infrastructure layer handled the messy reality of SSH, packaging, and device variability.

For the API, I used `Huma v2` for its strong JSON ergonomics and automatic OpenAPI docs. For the desktop layer, I used `Tauri`, which on Windows uses the system WebView2 instead of bundling a browser engine the way Electron does.

## The Hardest Challenge: Offline Docker at a Fixed Version

The hardest technical challenge was installing Docker 27.5.1 on air-gapped devices across different Linux distros. The standard repositories did not exist in the default sources list, and we needed a precise version.

The solution became an offline dependency pipeline:

1. Read device metadata (distro, codename, OS version).
2. Check `apt-cache policy` and the current sources list to understand what the device can resolve natively.
3. Build the correct repository and package URLs dynamically.
4. Download `.deb` packages for Docker.
5. Generate and verify signatures and checksums.
6. Upload packages to the target.
7. Compute dependency signatures, deduplicate, and fetch missing dependencies.
8. Install everything offline.
9. Remove Docker sources to prevent unexpected upgrades, then run `apt update` to validate the removal.

The tricky part is that a signature is effectively a package plus its full dependency tree. So the process was iterative: I generated signatures for each Docker package, concatenated them, removed duplicates, and then fetched the missing dependencies once. That was meant to make the final offline bundle complete and version-locked.

It was tedious and deeply technical, but it gave us offline installs pinned to a specific Docker version.

## The Supporting System

Beyond Docker, the installer needed:

- SSH provisioning with key generation and passwordless sudo.
- APT-offline signature workflows for system dependencies.
- Go workers to monitor port availability, APT locks, and connectivity.

The frontend showed the backend's state in real time, so whoever ran an install could follow its progress instead of guessing.

## The Result

Before this there was no installer, only requirements. The installer ran the steps above over SSH, showed installation progress in real time, and used retry and fallback mechanisms to handle `apt` lock conflicts and dependency resolution. After the internship I stayed on the project as a software engineer and owned it until March 2026.

## Personal Turning Point

This was my first serious Go project and my first time applying clean architecture on an industrial product. I learned fast during the summer. I followed the Software Design and Architecture specialization from the University of Alberta on Coursera to structure my learning, and worked through UML and system design. That helped me move from ad-hoc coding to spec-driven development.

At one point, the architecture clicked, the system stabilized, and I realized I could navigate the codebase with confidence. That was the moment I felt legitimate.

## What I Took Away

If there is one lesson, it is this: on this project, reliability and repeatability mattered more than clever tricks. Architecture and automation beat heroics.
