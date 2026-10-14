---
title: "From Backlog to MVP: Building an Offline Industrial Installer in Go"
description: "How I designed and built, as an intern, an installer for air-gapped industrial PCs: offline Docker installs from .deb packages, with 27.5.1 as the default version, and what I learned doing it."
author: "Camil Benameur"
pubDate: 2026-02-05
updatedDate: 2026-10-14
correction:
  date: 2026-10-14
  text: "October 14, 2026: I corrected how I described the offline Docker install (which packages were pinned, how dependencies were resolved, what some steps did), reworded other steps and the supporting system to match the code, softened claims about the architecture and the outcome, and removed one setup detail and one statement about other people's availability. A later post looks at the project in more depth. September 29, 2026: I removed claims I could not back up: that a manual install took hours and dropped to minutes, that the installer scaled to fleets, that the result was reproducible and less error-prone, that it ran in production, and that there were strict deployment windows. I also removed statements about my teammates and about working mostly alone, described the starting point as a need rather than a client request, softened some general claims about industrial PCs, and added that I owned the project until March 2026."
tags: ["go", "architecture", "devops", "offline", "installation", "industrial"]
slug: "from-backlog-to-offline-installer"
---

## The Moment It Started

This project began as a backlog item with a clear need. I joined as an intern and designed and built the first version. The context was simple to describe and hard to execute: install industrial automation software on industrial PCs that often have no internet access.

There was no installer. Only requirements. The design started from scratch.

## The Real-World Constraints

Industrial PCs are not like dev laptops. You often cannot assume:

- Internet access.
- A local screen, keyboard, or mouse.
- Flexible versions of system packages.

What does exist are strict cybersecurity requirements, limited access, and a need for predictability. The installer had to work offline and behave predictably.

## Architecture Choices That Made It Possible

I chose a hexagonal architecture in Go from the design stage. I aimed to keep the domain free of SSH, SQL and HTTP libraries, and mostly did. The infrastructure layer handled the messy reality of SSH, packaging and device variability, though in the Docker installation service some shell commands ended up in the domain anyway.

For the API, I used `Huma v2` for its JSON ergonomics and OpenAPI generation from Go types. For the desktop layer, I used `Tauri`, which on Windows uses the system WebView2 instead of bundling a browser engine the way Electron does.

## The Hardest Challenge: Offline Docker at a Fixed Version

The hardest technical challenge was installing Docker 27.5.1 on air-gapped apt-based Linux devices (the repository layout in the code is Ubuntu's). The standard repositories did not exist in the default sources list, and we needed a precise version.

The solution became an offline dependency pipeline:

1. Read device metadata (distro, codename, OS version).
2. Inspect each uploaded package's declared dependencies and ask `apt-cache policy` which ones the target can already see.
3. Build the correct repository and package URLs dynamically.
4. Download `.deb` packages for Docker.
5. Generate apt-offline manifests (the list of files the target still needs).
6. Upload packages to the target.
7. Compute dependency signatures, deduplicate, and fetch missing dependencies.
8. Install everything offline.
9. Remove the Docker repository and keyring entries to prevent unexpected upgrades, then, when the device has connectivity, refresh the package lists as a best-effort step.

The tricky part is that dependencies are only known once you ask the target. In apt-offline terms, a "signature" is a manifest of the files apt would download on that device, so it lists only what is still missing there. The process was iterative: read the dependencies of each Docker package, walk them as a queue that grows as new dependencies appear, deduplicate, and fetch each missing package once on the operator machine. That was meant to make the offline bundle complete. In practice only `docker-ce` and `docker-ce-cli` were pinned, and unresolved dependencies were reported as warnings rather than errors.

It was tedious and deeply technical. The result was an offline install flow where `docker-ce` and `docker-ce-cli` default to version 27.5.1.

## The Supporting System

Beyond Docker, the installer needed:

- SSH provisioning with key generation.
- APT-offline signature workflows for system dependencies.
- A background Go worker that periodically checks, for each registered device, whether the SSH port is reachable, whether SSH works, whether it has internet access and whether apt is busy.

The frontend showed the backend's state in real time, so whoever ran an install could follow its progress instead of guessing.

## The Result

Before this there was no installer, only requirements. The installer ran the target-side steps over SSH and SFTP, with the operator machine downloading the packages. It showed step-level progress live, and it retried `apt` lock conflicts with bounded backoff and used fallbacks when installing packages. After the internship I stayed on the project as a software engineer and owned it until March 2026.

## Personal Turning Point

This was my first serious Go project and my first time applying clean architecture on an industrial product. I learned fast during the summer. I followed the Software Design and Architecture specialization from the University of Alberta on Coursera to structure my learning, and worked through UML and system design. That helped me structure my design work with UML and written specifications.

At one point, the architecture clicked for me, and I felt I could navigate the codebase with confidence. That was the moment I felt legitimate.

## What I Took Away

If there is one lesson, it is this: on this project, I aimed for reliability and repeatability over clever tricks, and I learned that an aim only counts once checks can fail a build. Architecture and automation matter, but only where something can actually fail.

## Changes to this post (2026-10-14)

The note at the top of the page gives the main correction. These are the other main changes:

- the Docker version pinning: only two of the five packages were pinned, and only as a default
- the description of the offline pipeline (dependency walk, manifests, the final steps) and of the supporting worker, rewritten to match what the code does
- the claim about different Linux distros: the download path in the code follows Ubuntu's repository layout
- the architecture description, the "system stabilized" line and the spec-driven development line, written as what I aimed for and felt rather than what was achieved
- a statement about other people's availability, the API documentation claim and one setup detail

For a closer look at the same project, including what I over-built, see [How an Offline Installer Works, and What I Over-Built Along the Way](/blog/offline-installer-retrospective/).
