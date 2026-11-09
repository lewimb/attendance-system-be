import {
  applyDecorators,
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import {
  ATTENDANCE_PATTERNS,
  ATTENDANCE_SERVICE,
  type CheckInPayload,
  type CheckOutPayload,
  EMPLOYEE_PATTERNS,
  EMPLOYEE_SERVICE,
  type EmployeeSummary,
  type FindAllAttendancePayload,
  type FindAttendancePhotoPayload,
  type FindEmployeeIdsByDepartmentPayload,
  type FindEmployeesByIdsPayload,
  type FindMyAttendancePayload,
  type Paginated,
} from '@app/common';
import {
  type AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { Role } from '../common/decorators/role.decorator.js';
import { sendRpc } from '../common/utils/send-rpc.util.js';
import { PhotoStorageService } from './photo-storage.service.js';
import { PhotoTooLargeFilter } from './photo-too-large.filter.js';
import {
  ApiAuth,
  ApiEnvelope,
  ApiError,
  ApiValidationError,
} from '../common/swagger/decorators.js';
import {
  AttendanceModel,
  HrAttendanceModel,
} from '../common/swagger/models.js';

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const MAX_HR_RANGE_DAYS = 31;

const ApiDateRange = (maxDays?: number) =>
  applyDecorators(
    ApiQuery({
      name: 'from',
      required: false,
      type: String,
      example: '2026-11-01',
      description: 'YYYY-MM-DD, send together with to',
    }),
    ApiQuery({
      name: 'to',
      required: false,
      type: String,
      example: '2026-11-30',
      description: `YYYY-MM-DD, send together with from.${maxDays ? ` At most ${maxDays} days.` : ''} Both default to the current month.`,
    }),
  );

const ApiPage = () =>
  applyDecorators(
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      example: 20,
      description: 'Max 100',
    }),
  );

@ApiTags('attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(
    @Inject(ATTENDANCE_SERVICE) private readonly attendanceClient: ClientProxy,
    @Inject(EMPLOYEE_SERVICE) private readonly employeeClient: ClientProxy,
    private readonly photoStorage: PhotoStorageService,
  ) {}

  @ApiOperation({
    summary: 'Check in for today with a photo',
    description:
      'The date and time come from the server. Status is LATE after WORK_START_TIME in BUSINESS_TZ.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['photo'],
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description: 'JPEG or PNG, max 3 MB, checked by its content',
        },
      },
    },
  })
  @ApiAuth({ write: true })
  @ApiEnvelope(AttendanceModel, { status: 201, message: 'Checked in' })
  @ApiError(400, 'Photo is required', ['PHOTO_REQUIRED'])
  @ApiError(409, 'Already checked in today', ['ALREADY_CHECKED_IN'])
  @ApiError(413, 'Photo must be at most 3 MB', ['PHOTO_TOO_LARGE'])
  @ApiError(415, 'Photo must be a JPEG or PNG image', [
    'UNSUPPORTED_PHOTO_TYPE',
  ])
  @Post('check-in')
  @ResponseMessage('Checked in')
  @UseFilters(PhotoTooLargeFilter)
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
    }),
  )
  async checkIn(
    @CurrentUser() user: AuthUser,
    @UploadedFile() photo: Express.Multer.File | undefined,
  ) {
    if (!photo || photo.size === 0) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'PHOTO_REQUIRED',
        message: 'Photo is required',
      });
    }

    const mime = (await fileTypeFromBuffer(photo.buffer))?.mime;
    if (mime !== 'image/jpeg' && mime !== 'image/png') {
      throw new UnsupportedMediaTypeException({
        statusCode: 415,
        code: 'UNSUPPORTED_PHOTO_TYPE',
        message: 'Photo must be a JPEG or PNG image',
      });
    }

    const photoPath = await this.photoStorage.save(photo.buffer, mime);
    const payload: CheckInPayload = {
      employeeId: user.id,
      photoPath,
      photoMime: mime,
    };

    try {
      return await sendRpc(
        this.attendanceClient,
        ATTENDANCE_PATTERNS.CHECK_IN,
        payload,
      );
    } catch (err) {
      await this.photoStorage.remove(photoPath);
      throw err;
    }
  }

  @ApiOperation({ summary: "Check out of today's attendance" })
  @ApiAuth({ write: true })
  @ApiEnvelope(AttendanceModel, { message: 'Checked out' })
  @ApiError(409, 'Not checked in today', [
    'NOT_CHECKED_IN',
    'ALREADY_CHECKED_OUT',
  ])
  @Post('check-out')
  @HttpCode(200)
  @ResponseMessage('Checked out')
  checkOut(@CurrentUser() user: AuthUser) {
    const payload: CheckOutPayload = { employeeId: user.id };
    return sendRpc(
      this.attendanceClient,
      ATTENDANCE_PATTERNS.CHECK_OUT,
      payload,
    );
  }

  @ApiOperation({ summary: 'List my own attendance' })
  @ApiDateRange()
  @ApiPage()
  @ApiAuth()
  @ApiEnvelope(AttendanceModel, {
    paginated: true,
    message: 'Attendance retrieved',
  })
  @ApiValidationError()
  @Get('me')
  @ResponseMessage('Attendance retrieved')
  findMine(
    @CurrentUser() user: AuthUser,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const payload: FindMyAttendancePayload = {
      employeeId: user.id,
      ...this.parseRange(from, to),
      ...this.clampPage(page, limit),
    };
    return sendRpc(
      this.attendanceClient,
      ATTENDANCE_PATTERNS.FIND_BY_EMPLOYEE,
      payload,
    );
  }

  @ApiOperation({
    summary: 'List all attendance, view only (HR admin)',
    description:
      "Each row includes the employee's code, name and department, or null when the employee no longer exists.",
  })
  @ApiDateRange(MAX_HR_RANGE_DAYS)
  @ApiQuery({ name: 'employeeId', required: false, type: Number })
  @ApiQuery({ name: 'departmentId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['PRESENT', 'LATE'] })
  @ApiPage()
  @ApiAuth({ hrOnly: true })
  @ApiEnvelope(HrAttendanceModel, {
    paginated: true,
    message: 'Attendance retrieved',
  })
  @ApiValidationError()
  @Get()
  @Role('HR_ADMIN')
  @ResponseMessage('Attendance retrieved')
  async findAll(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('employeeId', new ParseIntPipe({ optional: true }))
    employeeId: number | undefined,
    @Query('departmentId', new ParseIntPipe({ optional: true }))
    departmentId: number | undefined,
    @Query('status') status: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    if (status !== undefined && status !== 'PRESENT' && status !== 'LATE') {
      throw new BadRequestException('status must be PRESENT or LATE');
    }

    const payload: FindAllAttendancePayload = {
      ...this.parseRange(from, to, MAX_HR_RANGE_DAYS),
      employeeIds: await this.resolveEmployeeIds(employeeId, departmentId),
      status,
      ...this.clampPage(page, limit),
    };

    const result = await sendRpc<Paginated<{ employeeId: string }>>(
      this.attendanceClient,
      ATTENDANCE_PATTERNS.FIND_ALL,
      payload,
    );

    const ids = [...new Set(result.items.map((item) => item.employeeId))];
    const employees =
      ids.length === 0
        ? []
        : await sendRpc<EmployeeSummary[]>(
            this.employeeClient,
            EMPLOYEE_PATTERNS.FIND_BY_IDS,
            { ids } satisfies FindEmployeesByIdsPayload,
          );
    const byId = new Map(employees.map((employee) => [employee.id, employee]));

    return {
      ...result,
      items: result.items.map((item) => ({
        ...item,
        employee: byId.get(item.employeeId) ?? null,
      })),
    };
  }

  @ApiOperation({
    summary: 'Get the check-in photo',
    description:
      'Employees can only get their own photos. HR admins can get any photo.',
  })
  @ApiProduces('image/jpeg', 'image/png')
  @ApiOkResponse({
    description: 'The photo, not wrapped',
    content: {
      'image/jpeg': { schema: { type: 'string', format: 'binary' } },
      'image/png': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiAuth()
  @ApiError(404, 'Attendance not found', ['NOT_FOUND'])
  @Get(':id/photo')
  async findPhoto(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const payload: FindAttendancePhotoPayload = {
      attendanceId: String(id),
      ownerId: user.role === 'HR_ADMIN' ? undefined : user.id,
    };
    const { photoPath, photoMime } = await sendRpc<{
      photoPath: string;
      photoMime: string;
    }>(this.attendanceClient, ATTENDANCE_PATTERNS.FIND_PHOTO, payload);

    const stream = await this.photoStorage.open(photoPath);
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=3600',
    });
    return new StreamableFile(stream, {
      type: photoMime,
      disposition: 'inline',
    });
  }

  private parseRange(
    from: string | undefined,
    to: string | undefined,
    maxDays?: number,
  ) {
    if (from === undefined && to === undefined) return {};

    if (from === undefined || to === undefined) {
      throw new BadRequestException('from and to must be given together');
    }
    if (!this.isDate(from) || !this.isDate(to)) {
      throw new BadRequestException('from and to must be dates as YYYY-MM-DD');
    }

    const days = (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1;
    if (days < 1) {
      throw new BadRequestException('from must be on or before to');
    }
    if (maxDays && days > maxDays) {
      throw new BadRequestException(
        `Date range can be at most ${maxDays} days`,
      );
    }

    return { from, to };
  }

  private isDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }

  private async resolveEmployeeIds(
    employeeId: number | undefined,
    departmentId: number | undefined,
  ): Promise<string[] | undefined> {
    if (departmentId === undefined) {
      return employeeId === undefined ? undefined : [String(employeeId)];
    }

    const departmentIds = await sendRpc<string[]>(
      this.employeeClient,
      EMPLOYEE_PATTERNS.FIND_IDS_BY_DEPARTMENT,
      { departmentId } satisfies FindEmployeeIdsByDepartmentPayload,
    );

    if (employeeId === undefined) return departmentIds;
    return departmentIds.filter((id) => id === String(employeeId));
  }

  private clampPage(page: number, limit: number) {
    return {
      page: Math.max(page, 1),
      limit: Math.min(Math.max(limit, 1), 100),
    };
  }
}
