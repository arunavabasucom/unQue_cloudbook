import request from "supertest";
import app from "../src/server"; // Import Express app
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("E2E College Appointment System Test", () => {
  let studentA1Token: string;
  let studentA2Token: string;
  let professorP1Token: string;
  let slotId: string;

  beforeAll(async () => {

     // delete related data first
    await prisma.booking.deleteMany();
    await prisma.slot.deleteMany();

    // Now clear users
    await prisma.user.deleteMany();
    
    // 1. Student A1 registers & authenticates
    await request(app).post("/auth/register").send({
      name: "Student A1",
      email: "studentA1@example.com",
      password: "password123",
      role: "STUDENT",
    });

    const studentA1Login = await request(app).post("/auth/login").send({
      email: "studentA1@example.com",
      password: "password123",
    });
    studentA1Token = studentA1Login.body.token;

    // 2. Professor P1 registers & authenticates
    await request(app).post("/auth/register").send({
      name: "Professor P1",
      email: "professorP1@example.com",
      password: "password123",
      role: "PROFESSOR",
    });

    const professorP1Login = await request(app).post("/auth/login").send({
      email: "professorP1@example.com",
      password: "password123",
    });
    professorP1Token = professorP1Login.body.token;

    // 3. Professor P1 specifies availability
    const slotResponse = await request(app)
      .post("/booking/slots")
      .set("Authorization", `Bearer ${professorP1Token}`)
      .send({ time: "2024-02-01T10:00:00Z", duration: 30 });

    slotId = slotResponse.body.slot.id;
  });

  test("4. Student A1 views available time slots", async () => {
    const res = await request(app)
      .get("/booking/slots")
      .set("Authorization", `Bearer ${studentA1Token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("5. Student A1 books an appointment", async () => {
    const res = await request(app)
      .post("/booking/book")
      .set("Authorization", `Bearer ${studentA1Token}`)
      .send({ slotId });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Appointment booked");
  });

  test("6. Student A2 registers & authenticates", async () => {
    await request(app).post("/auth/register").send({
      name: "Student A2",
      email: "studentA2@example.com",
      password: "password123",
      role: "STUDENT",
    });

    const studentA2Login = await request(app).post("/auth/login").send({
      email: "studentA2@example.com",
      password: "password123",
    });

    studentA2Token = studentA2Login.body.token;
    expect(studentA2Token).toBeDefined();
  });

  test("7. Student A2 books another slot", async () => {
    const newSlotResponse = await request(app)
      .post("/booking/slots")
      .set("Authorization", `Bearer ${professorP1Token}`)
      .send({ time: "2024-02-01T11:00:00Z", duration: 30 });

    const newSlotId = newSlotResponse.body.slot.id;

    const res = await request(app)
      .post("/booking/book")
      .set("Authorization", `Bearer ${studentA2Token}`)
      .send({ slotId: newSlotId });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Appointment booked");
  });

  test("8.  Professor P1 cancels appointment with Student A1", async () => {
    const res = await request(app)
      .delete(`/booking/cancel/${slotId}`)
      .set("Authorization", `Bearer ${professorP1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Appointment canceled");
  });

  test("9. Student A1 checks appointments (should be empty)", async () => {
    const res = await request(app)
      .get("/booking/appointments")
      .set("Authorization", `Bearer ${studentA1Token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
