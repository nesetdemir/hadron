<div align="center">
  <img src="apps/dokploy/public/icon.svg" alt="Hadron" width="120" />
  <h1>Hadron</h1>
  <p>Dokploy tabanlı, bağımsız self-hosted platform</p>
</div>

---

Hadron, [Dokploy](https://github.com/dokploy/dokploy) temelleri üzerine inşa edilmiş bir versiyondur.

## Özellikler

Dokploy'un tüm özelliklerini içerir:

- **Uygulama Deploy**: Node.js, PHP, Python, Go, Ruby ve daha fazlası
- **Veritabanı Yönetimi**: MySQL, PostgreSQL, MongoDB, MariaDB, Redis
- **Otomatik Backup**: Veritabanlarını harici depolamaya yedekleme
- **Docker Compose**: Karmaşık uygulamalar için native destek
- **Multi Node**: Docker Swarm ile çoklu sunucu yönetimi
- **Hazır Şablonlar**: Plausible, Pocketbase, Calcom vb. tek tıkla kurulum
- **Traefik Entegrasyonu**: Otomatik routing ve load balancing
- **Gerçek Zamanlı İzleme**: CPU, bellek, disk ve ağ kullanımı
- **CLI/API**: Komut satırı ve API ile yönetim
- **Bildirimler**: Slack, Discord, Telegram, Email ile deployment bildirimleri

## Kurulum

VPS üzerinde çalıştır:

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

Kurulumdan sonra Hadron image'ına geç:

```bash
docker service update --force --image nesetdemir/hadron:latest dokploy
```

## Güncelleme

```bash
# Sunucuda çalıştır
docker service update --force --image nesetdemir/hadron:latest dokploy
```

Sorun olursa rollback:

```bash
docker service update --rollback dokploy
```

## Kaynak Koddan Build

```bash
# Gereksinimler: Docker Desktop (buildx), Docker Hub hesabı

# Build ve push
docker buildx build --platform linux/amd64 --pull --rm \
  -t "nesetdemir/hadron:latest" \
  -t "nesetdemir/hadron:v0.27.1" \
  -f Dockerfile --push .
```

## Ortam Değişkenleri

| Değişken | Varsayılan | Açıklama |
|----------|-----------|----------|
| `DOCKER_IMAGE` | `dokploy/dokploy` | Self-update için Docker Hub image |
| `DOCKER_SERVICE_NAME` | `dokploy` | Docker Swarm servis adı |

## Lisans

Dokploy lisansı ile aynıdır. Detaylar için [Dokploy](https://github.com/dokploy/dokploy) reposuna bakınız.
