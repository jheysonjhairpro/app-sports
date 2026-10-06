-- CreateTable
CREATE TABLE `rol` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(30) NOT NULL,

    UNIQUE INDEX `rol_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rol_id` INTEGER NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `correo` VARCHAR(150) NOT NULL,
    `telefono` VARCHAR(20) NULL,
    `foto_url` VARCHAR(400) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuario_correo_key`(`correo`),
    UNIQUE INDEX `usuario_telefono_key`(`telefono`),
    INDEX `usuario_rol_id_idx`(`rol_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_token` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `expira_en` DATETIME(3) NOT NULL,
    `revocado_en` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_token_token_hash_key`(`token_hash`),
    INDEX `refresh_token_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `expira_en` DATETIME(3) NOT NULL,
    `usado_en` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `password_reset_token_hash_key`(`token_hash`),
    INDEX `password_reset_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verificacion_correo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `correo` VARCHAR(150) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `telefono` VARCHAR(20) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `codigo_hash` CHAR(64) NOT NULL,
    `intentos` TINYINT NOT NULL DEFAULT 0,
    `expira_en` DATETIME(3) NOT NULL,
    `ultimo_envio` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `verificacion_correo_correo_key`(`correo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `complejo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(120) NOT NULL,
    `descripcion` TEXT NULL,
    `direccion` VARCHAR(200) NULL,
    `ciudad` VARCHAR(80) NOT NULL DEFAULT 'Abancay',
    `latitud` DECIMAL(9, 6) NULL,
    `longitud` DECIMAL(9, 6) NULL,
    `telefono` VARCHAR(20) NULL,
    `foto_url` VARCHAR(400) NULL,
    `destacado` BOOLEAN NOT NULL DEFAULT false,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `complejo_destacado_activo_idx`(`destacado`, `activo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `complejo_administrador` (
    `complejo_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,

    INDEX `complejo_administrador_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`complejo_id`, `usuario_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cancha` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `complejo_id` INTEGER NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` TEXT NULL,
    `precio_hora` DECIMAL(8, 2) NOT NULL,
    `servicios` JSON NULL,
    `foto_url` VARCHAR(400) NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cancha_complejo_id_nombre_key`(`complejo_id`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `horario_cancha` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cancha_id` INTEGER NOT NULL,
    `dia_semana` TINYINT NOT NULL,
    `hora_inicio` TINYINT NOT NULL,
    `hora_fin` TINYINT NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `horario_cancha_cancha_id_dia_semana_hora_inicio_key`(`cancha_id`, `dia_semana`, `hora_inicio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `promocion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `complejo_id` INTEGER NOT NULL,
    `titulo` VARCHAR(120) NOT NULL,
    `descripcion` VARCHAR(250) NULL,
    `tipo` ENUM('porcentaje', 'monto_fijo', 'dos_por_uno') NOT NULL,
    `valor` DECIMAL(8, 2) NULL,
    `dias_semana` JSON NULL,
    `hora_desde` TINYINT NULL,
    `hora_hasta` TINYINT NULL,
    `vigente_desde` DATE NOT NULL,
    `vigente_hasta` DATE NOT NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `promocion_complejo_id_activa_idx`(`complejo_id`, `activa`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reserva` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `cancha_id` INTEGER NOT NULL,
    `promocion_id` INTEGER NULL,
    `inicio` DATETIME(3) NOT NULL,
    `fin` DATETIME(3) NOT NULL,
    `horas` TINYINT NOT NULL,
    `precio_hora` DECIMAL(8, 2) NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `descuento` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(10, 2) NOT NULL,
    `estado` ENUM('pendiente', 'confirmada', 'rechazada', 'cancelada', 'completada') NOT NULL DEFAULT 'pendiente',
    `vence_en` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `reserva_usuario_id_inicio_idx`(`usuario_id`, `inicio`),
    INDEX `reserva_cancha_id_inicio_idx`(`cancha_id`, `inicio`),
    INDEX `reserva_estado_vence_en_idx`(`estado`, `vence_en`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reserva_bloque` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reserva_id` INTEGER NOT NULL,
    `cancha_id` INTEGER NOT NULL,
    `inicio` DATETIME(3) NOT NULL,

    INDEX `reserva_bloque_reserva_id_idx`(`reserva_id`),
    UNIQUE INDEX `reserva_bloque_cancha_id_inicio_key`(`cancha_id`, `inicio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pago` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reserva_id` INTEGER NOT NULL,
    `revisado_por` INTEGER NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `voucher_url` VARCHAR(400) NOT NULL,
    `numero_operacion` VARCHAR(60) NULL,
    `estado` ENUM('pendiente', 'verificado', 'rechazado') NOT NULL DEFAULT 'pendiente',
    `motivo_rechazo` VARCHAR(250) NULL,
    `revisado_en` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `pago_numero_operacion_key`(`numero_operacion`),
    INDEX `pago_reserva_id_idx`(`reserva_id`),
    INDEX `pago_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reserva_historial` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reserva_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NULL,
    `estado_anterior` ENUM('pendiente', 'confirmada', 'rechazada', 'cancelada', 'completada') NULL,
    `estado_nuevo` ENUM('pendiente', 'confirmada', 'rechazada', 'cancelada', 'completada') NOT NULL,
    `comentario` VARCHAR(250) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `reserva_historial_reserva_id_idx`(`reserva_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notificacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `reserva_id` INTEGER NULL,
    `tipo` ENUM('reserva_creada', 'reserva_confirmada', 'reserva_rechazada', 'reserva_cancelada', 'voucher_pendiente', 'voucher_rechazado', 'promocion', 'recordatorio', 'sistema') NOT NULL,
    `canal` ENUM('app', 'correo') NOT NULL DEFAULT 'app',
    `titulo` VARCHAR(120) NOT NULL,
    `mensaje` VARCHAR(300) NULL,
    `leida` BOOLEAN NOT NULL DEFAULT false,
    `enviada_en` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notificacion_usuario_id_leida_created_at_idx`(`usuario_id`, `leida`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reporte` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `complejo_id` INTEGER NULL,
    `generado_por` INTEGER NOT NULL,
    `periodo_desde` DATE NOT NULL,
    `periodo_hasta` DATE NOT NULL,
    `total_reservas` INTEGER NOT NULL DEFAULT 0,
    `total_ingresos` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuario` ADD CONSTRAINT `usuario_rol_id_fkey` FOREIGN KEY (`rol_id`) REFERENCES `rol`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_token` ADD CONSTRAINT `refresh_token_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset` ADD CONSTRAINT `password_reset_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complejo_administrador` ADD CONSTRAINT `complejo_administrador_complejo_id_fkey` FOREIGN KEY (`complejo_id`) REFERENCES `complejo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complejo_administrador` ADD CONSTRAINT `complejo_administrador_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cancha` ADD CONSTRAINT `cancha_complejo_id_fkey` FOREIGN KEY (`complejo_id`) REFERENCES `complejo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `horario_cancha` ADD CONSTRAINT `horario_cancha_cancha_id_fkey` FOREIGN KEY (`cancha_id`) REFERENCES `cancha`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promocion` ADD CONSTRAINT `promocion_complejo_id_fkey` FOREIGN KEY (`complejo_id`) REFERENCES `complejo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reserva` ADD CONSTRAINT `reserva_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reserva` ADD CONSTRAINT `reserva_cancha_id_fkey` FOREIGN KEY (`cancha_id`) REFERENCES `cancha`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reserva` ADD CONSTRAINT `reserva_promocion_id_fkey` FOREIGN KEY (`promocion_id`) REFERENCES `promocion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reserva_bloque` ADD CONSTRAINT `reserva_bloque_reserva_id_fkey` FOREIGN KEY (`reserva_id`) REFERENCES `reserva`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reserva_bloque` ADD CONSTRAINT `reserva_bloque_cancha_id_fkey` FOREIGN KEY (`cancha_id`) REFERENCES `cancha`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pago` ADD CONSTRAINT `pago_reserva_id_fkey` FOREIGN KEY (`reserva_id`) REFERENCES `reserva`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pago` ADD CONSTRAINT `pago_revisado_por_fkey` FOREIGN KEY (`revisado_por`) REFERENCES `usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reserva_historial` ADD CONSTRAINT `reserva_historial_reserva_id_fkey` FOREIGN KEY (`reserva_id`) REFERENCES `reserva`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reserva_historial` ADD CONSTRAINT `reserva_historial_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacion` ADD CONSTRAINT `notificacion_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacion` ADD CONSTRAINT `notificacion_reserva_id_fkey` FOREIGN KEY (`reserva_id`) REFERENCES `reserva`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reporte` ADD CONSTRAINT `reporte_complejo_id_fkey` FOREIGN KEY (`complejo_id`) REFERENCES `complejo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reporte` ADD CONSTRAINT `reporte_generado_por_fkey` FOREIGN KEY (`generado_por`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
