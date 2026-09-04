import socket
import threading
from contextlib import closing
from backend.deployment.errors import PortAllocationError

class PortAllocator:
    """Safely allocates and reserves host ports for deployments."""

    def __init__(self, port_min: int = 10000, port_max: int = 20000) -> None:
        self.port_min = port_min
        self.port_max = port_max
        self._reserved_ports: set[int] = set()
        self._lock = threading.Lock()

    def allocate(self) -> int:
        """Finds an unused port in the configured range and reserves it."""
        # Find ports currently bound by Docker containers
        docker_used_ports: set[int] = set()
        try:
            import docker
            client = docker.from_env()
            for c in client.containers.list():
                for port_mappings in (c.ports or {}).values():
                    if port_mappings:
                        for m in port_mappings:
                            if "HostPort" in m and m["HostPort"]:
                                docker_used_ports.add(int(m["HostPort"]))
        except Exception:
            pass

        with self._lock:
            for port in range(self.port_min, self.port_max + 1):
                if port in self._reserved_ports or port in docker_used_ports:
                    continue
                if self._is_port_available(port):
                    self._reserved_ports.add(port)
                    return port
        raise PortAllocationError(f"No available ports in range {self.port_min}-{self.port_max}.")

    def release(self, port: int) -> None:
        """Releases a reserved port."""
        with self._lock:
            self._reserved_ports.discard(port)

    @staticmethod
    def _is_port_available(port: int) -> bool:
        """Checks if the port is currently available on all host interfaces."""
        with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
            try:
                # Docker on Windows binds on 0.0.0.0 and SO_REUSEADDR can sometimes mask it
                sock.bind(("0.0.0.0", port))
                return True
            except OSError:
                return False
