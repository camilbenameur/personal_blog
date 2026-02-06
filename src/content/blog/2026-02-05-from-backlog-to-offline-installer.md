---
title: "From Backlog to MVP: Building an Offline Industrial Installer in Go"
description: "A storytelling case study on designing an offline-first installer with strict versioning and reproducible deployments"
author: "Camil Benameur"
pubDate: 2026-02-05
tags: ["go", "architecture", "devops", "offline", "installation", "industrial"]
slug: "from-backlog-to-offline-installer"
---

## The Moment It Started

This project began as a backlog item with a clear client need, but no bandwidth to run a POC. I joined as an intern and took ownership of turning that need into a real MVP. The context was simple to describe and hard to execute: install a complex industrial runtime on machines that often have no internet access.

There was no installer. Only requirements. So I built everything from scratch.

## The Real-World Constraints

Industrial PCs are not like dev laptops. You cannot assume:

- Internet access.
- A local screen, keyboard, or mouse.
- Flexible versions of system packages.

What does exist are strict deployment windows, limited access, and a need for predictability. The installer had to work offline, be reproducible, and scale to fleets.

## Architecture Choices That Made It Possible

I picked a hexagonal architecture in Go early. It let me keep the domain clean, testable, and maintainable while the infrastructure layer handled the messy reality of SSH, packaging, and device variability. It also made collaboration easier when teammates later joined the project.

For the API, I used `Huma v2` for its strong JSON ergonomics and automatic OpenAPI docs. For the desktop layer, I used `Tauri` to embed WebView2 with minimal overhead compared to Electron.

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

The tricky part is that a signature is effectively a package plus its full dependency tree. So the process is iterative: I generate signatures for each Docker package, concatenate them, remove duplicates, and then fetch the missing dependencies once. That ensures the final offline bundle is complete and version-locked.

It was tedious and deeply technical, but it gave us offline installs with strict version control and repeatable results.

## The Supporting System

Beyond Docker, the installer needed:

- SSH provisioning with key generation and passwordless sudo.
- APT-offline signature workflows for system dependencies.
- Go workers to monitor port availability, APT locks, and connectivity.

The frontend reflected backend states in real time, so operators could track progress on multiple devices without guessing.

## The Impact

Before the installer, a single machine could take hours of manual work. With the MVP, those hours drop to minutes, even at fleet scale. The flow is reproducible, offline-friendly, and far less error-prone.

## Personal Turning Point

This was my first serious Go project and my first time applying clean architecture in production. I learned fast and mostly alone during the summer. I followed a Coursera professional certification (University of Alberta) to structure my learning and went deep into UML and system design. That is what allowed me to move from ad-hoc coding to spec-driven development.

At one point, the architecture clicked, the system stabilized, and I realized I could navigate the codebase with confidence. When teammates later needed time to adapt to the architecture, it confirmed I had built something coherent. That was the moment I felt legitimate.

## What I Took Away

If there is one lesson, it is this: in industrial software, reliability and reproducibility matter more than clever tricks. Architecture and automation beat heroics.

If you are a developer or recruiter interested in Go, offline deployment, or industrial-scale workflows, I would love to connect.
